import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { userPrisma } from '../utils/prisma/userClient.js';

dotenv.config({ path: './.env' });
const router = express.Router();

/** 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  try {
    const { name, id, password, passwordCK } = req.body;

    const isExistUser = await userPrisma.users.findFirst({
      where: {
        id: id,
      },
    });

    if (isExistUser) {
      return res.status(409).json({
        message: '이미 존재하는 아이디입니다.',
      });
    }

    // 공백 체크 정규표현식 - 탭, 스페이스
    const space = /\s/g;

    if (password.match(space)) {
      return res.status(401).json({
        message: '비밀번호에 공백이 포함되어있습니다.',
      });
    }

    if (password.length < 6) {
      return res.status(401).json({
        message: '비밀번호는 6자리 이상이어야 합니다.',
      });
    }

    if (password !== passwordCK) {
      return res.status(401).json({
        message: '비밀번호가 일치하지 않습니다.',
      });
    }

    // ^ : 문자열의 시작을 나타내는 메타 문자
    // [a-z] : 첫 글자는 영어 소문자만 허용
    // [a-z0-9]{6,15} : 이후 글자는 영어 소문자, 숫자만 허용하며, 글자 수는 6부터 15까지 허용
    // $ : 문자열의 끝을 나타내는 메타 문자
    const regex = /^[a-z][a-z0-9]{6,15}$/;

    if (!regex.test(id)) {
      return res.status(401).json({
        message:
          '아이디는 영어 소문자로 시작하며, 영어 소문자, 숫자만 허용하며, 글자 수는 6부터 15까지 허용합니다.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Users 테이블에 사용자를 추가합니다.
    await userPrisma.users.create({
      data: {
        name,
        id,
        password: hashedPassword,
      },
    });

    const user = await userPrisma.users.findFirst({
      where: {
        id: id,
      },
      select: {
        name: true,
        id: true,
      },
    });

    return res.status(201).json({
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

/** 로그인 API **/
router.post('/sign-in', async (req, res, next) => {
  const { id, password } = req.body;
  const user = await userPrisma.users.findFirst({
    where: {
      id: id,
    },
  });

  if (!user) {
    return res.status(404).json({
      message: '존재하지 않는 아이디입니다.',
    });
  }
  // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
  else if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      message: '비밀번호가 일치하지 않습니다.',
    });
  }

  const token = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.SESSION_SECRET_KEY,
    { expiresIn: '1d' }
  );

  // authotization 쿠키에 Berer 토큰 형식으로 JWT를 저장합니다.
  res.cookie('authorization', `Bearer ${token}`);
  return res.status(200).json({ message: '로그인 성공' });
});

export default router;
