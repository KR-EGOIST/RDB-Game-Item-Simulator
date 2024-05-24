import express from 'express';
import jwt from 'jsonwebtoken';
import { userPrisma } from '../utils/prisma/userClient.js';
import { itemPrisma } from '../utils/prisma/itemClient.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/characters', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { name } = req.body;

    if (!name) {
      return res.status(401).json({
        message: '캐릭터 이름을 입력해주세요.',
      });
    }

    const space = /\s/g;
    if (name.match(space)) {
      return res.status(401).json({
        message: '캐릭터 이름에 공백이 포함되어있습니다.',
      });
    }

    const isExistCharacter = await userPrisma.characters.findFirst({
      where: {
        UserId: +userId,
        name,
      },
    });

    if (isExistCharacter) {
      return res.status(409).json({
        message: '이미 존재하는 캐릭터 이름입니다.',
      });
    }

    const character = await userPrisma.characters.create({
      data: {
        UserId: +userId,
        name,
      },
    });

    return res.status(201).json({
      message: '캐릭터를 생성했습니다.',
      data: character,
    });
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/characters/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { userId } = req.user;
    const { characterId } = req.params;
    const { name } = req.body;

    const character = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
    });

    if (!character) {
      return res.status(404).json({
        message: '존재하지 않는 캐릭터입니다.',
      });
    } else if (character.name !== name) {
      return res.status(401).json({
        message: '캐릭터 이름이 일치하지 않습니다.',
      });
    }

    await userPrisma.characters.delete({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
    });

    return res.status(200).json({
      message: '캐릭터를 삭제했습니다.',
    });
  }
);

router.get('/characters/:characterId', async (req, res, next) => {
  const { characterId } = req.params;
  const { authorization } = req.cookies;

  // 로그인 하지 않으면
  if (!authorization) {
    const character = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
      },
      select: {
        name: true,
        health: true,
        power: true,
      },
    });

    return res.status(200).json({ data: character });
  }
  // 로그인 했으면
  else {
    const [tokenType, token] = authorization.split(' ');

    if (tokenType !== 'Bearer')
      throw new Error('토큰 타입이 일치하지 않습니다.');

    const decodedToken = jwt.verify(token, process.env.SESSION_SECRET_KEY);
    const userId = decodedToken.userId;

    const user = await userPrisma.users.findFirst({
      where: { userId: +userId },
    });
    if (!user) {
      res.clearCookie('authorization');
      throw new Error('토큰 사용자가 존재하지 않습니다.');
    }

    // req.user에 사용자 정보를 저장합니다.
    req.user = user;

    // 조회하려는 캐릭터가 내 캐릭터인가? 확인
    const isMyCharacter = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
    });

    // 내 캐릭터라면
    if (isMyCharacter) {
      const character = await userPrisma.characters.findFirst({
        where: {
          characterId: +characterId,
          UserId: +userId,
        },
        select: {
          name: true,
          health: true,
          power: true,
          money: true,
        },
      });

      return res.status(200).json({ data: character });
    }
    // 다른 사람의 캐릭터라면
    else {
      const character = await userPrisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
        select: {
          name: true,
          health: true,
          power: true,
        },
      });

      return res.status(200).json({ data: character });
    }
  }
});

export default router;
