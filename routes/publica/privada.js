import express, { text } from 'express';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from "../../middlewares/isAdmin.js"

const router = express.Router();
const prisma = new PrismaClient();


// get para perfil ou o que for necessario
router.get('/usuario', async (req, res) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: {
        id: req.userID
      },
      select: {
        nome: true,
        email: true,
        
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'usuario não encontrado' });
    }
    res.status(200).json({ message: 'usuario encontrado', usuario });
  } catch (error) {
    res.status(500).json({ error: 'faha no servidor' });
  }

});

router.post('/quizzes', isAdmin, async(req,res)=>{
    const{ titulo } = req.body;
  try {
    const quiz = await prisma.quizzes.create({
      data: {
        titulo: titulo,
        criado_por: req.userID
      }
    });
    res.status(201).json({message:'quiz criado com sucesso', quiz});
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar quiz ' });
    
  }
})

// post criar pergunta
router.post('/questions', async (req, res) => {
  const { texto, quiz_id } = req.body;

  try {
    const question = await prisma.questions.create({
      data: {
        quiz_id: parseInt(quiz_id), 
        texto: texto
      }
    });

    res.status(201).json({ message: 'Pergunta criada com sucesso', question });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ error: 'Erro ao criar pergunta' });
  }
});

// criar resposta
router.post('/answers',async(req,res)=>{
  const {question_id,texto,correta} = req.body;
  try {
    const answer = await prisma.answers.create({
      data: {
        question_id: question_id,
        texto: texto,
        correta: correta
      }
    });
    res.status(201).json({message:'resposta criada com sucesso', answer});
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar resposta ' });
    
  }
})

router.get('/quizzes', async (req, res) => {
  try {
    const quizzes = await prisma.quizzes.findMany({
      include: {
        questions: {
          include: {
            answers: true
          }
        }
      }
    });

    res.status(200).json({ quizzes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar quizzes' });
  }
});

router.get('/quizzes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const quiz = await prisma.quizzes.findUnique({
      where: { id: parseInt(id) },
      include: {
        questions: {
          include: {
            answers: true
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    res.status(200).json({ quiz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar quiz' });
  }
});




// POST - Salvar pontuação do quiz realizada pelo usuário
router.post('/responder-quiz', async (req, res) => {
  const { quiz_id, score } = req.body;
  const user_id = req.userID;

  if (!quiz_id || score === undefined) {
    return res.status(400).json({ error: 'quiz_id e score são obrigatórios' });
  }

  try {
    const respostaUsuario = await prisma.respostas_usuarios.create({
      data: {
        quiz_id,
        user_id,
        score: parseFloat(score),
      },
    });

    res.status(201).json({ message: 'Pontuação salva com sucesso', respostaUsuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar pontuação' });
  }
});

// GET - Buscar histórico de quizzes realizados pelo usuário com média de desempenho
router.get('/historico', async (req, res) => {
  const user_id = req.userID;

  try {
    // Busca todas as respostas do usuário
    const respostas = await prisma.respostas_usuarios.findMany({
      where: { user_id },
      include: {
        quiz: true, // inclui dados do quiz para mostrar título, por exemplo
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcula média geral das pontuações do usuário
    const media = respostas.length
      ? respostas.reduce((acc, cur) => acc + cur.score, 0) / respostas.length
      : 0;

    res.status(200).json({
      historico: respostas,
      media,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});
// DELETE - Excluir quiz (somente admin)
router.delete('/quizzes/:id', isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Verifica se o quiz existe
    const quiz = await prisma.quizzes.findUnique({
      where: { id: parseInt(id) }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    // Exclui o quiz (cascata ou via deletes manuais se necessário)
    await prisma.quizzes.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ message: 'Quiz excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir quiz' });
  }
});



export default router;