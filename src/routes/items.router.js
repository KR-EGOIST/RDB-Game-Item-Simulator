import express from 'express';
import { itemPrisma } from '../utils/prisma/itemClient.js';

const router = express.Router();

/* 아이템 생성 API */
router.post('/items', async (req, res, next) => {
  try {
    const { item_name, item_stat, item_price } = req.body;

    const isExistItem = await itemPrisma.items.findFirst({
      where: {
        itemName: item_name,
      },
    });

    if (isExistItem) {
      return res.status(409).json({
        message: '이미 존재하는 아이템입니다.',
      });
    }

    if (!item_name) {
      return res.status(401).json({
        message: '아이템 이름을 입력해주세요.',
      });
    }

    if (!item_price) {
      return res.status(401).json({
        message: '아이템 가격을 입력해주세요.',
      });
    }

    const item = await itemPrisma.items.create({
      data: {
        itemName: item_name,
        itemPrice: item_price,
      },
    });

    await itemPrisma.itemStats.create({
      data: {
        ItemCode: item.itemCode,
        health: item_stat.health,
        power: item_stat.power,
      },
    });

    const data = await itemPrisma.items.findFirst({
      where: {
        itemCode: item.itemCode,
      },
      select: {
        itemCode: true,
        itemName: true,
        itemPrice: true,
        itemStat: {
          select: {
            health: true,
            power: true,
          },
        },
      },
    });

    return res.status(200).json({ data: data });
  } catch (err) {
    next(err);
  }
});

/* 아이템 수정 API */
router.patch('/items/:itemCode', async (req, res, next) => {
  const { itemCode } = req.params;
  const { item_name, item_stat } = req.body;

  const item = await itemPrisma.items.findFirst({
    where: {
      itemCode: +itemCode,
    },
  });

  if (!item) {
    return res.status(404).json({
      message: '존재하지 않는 아이템입니다.',
    });
  }

  await itemPrisma.items.update({
    where: {
      itemCode: +itemCode,
    },
    data: {
      itemName: item_name,
    },
  });

  await itemPrisma.itemStats.update({
    where: {
      ItemCode: +itemCode,
    },
    data: {
      health: item_stat.health,
      power: item_stat.power,
    },
  });

  const data = await itemPrisma.items.findFirst({
    where: {
      itemCode: +itemCode,
    },
    select: {
      itemCode: true,
      itemName: true,
      itemPrice: true,
      itemStat: {
        select: {
          health: true,
          power: true,
        },
      },
    },
  });

  return res.status(200).json({ data: data });
});

/* 아이템 목록 조회 API */
router.get('/items', async (req, res, next) => {
  const items = await itemPrisma.items.findMany({
    select: {
      itemCode: true,
      itemName: true,
      itemPrice: true,
    },
    orderBy: {
      itemCode: 'asc',
    },
  });

  return res.status(200).json({ data: items });
});

/* 아이템 상세 조회 API */
router.get('/items/:itemCode', async (req, res, next) => {
  const { itemCode } = req.params;

  const item = await itemPrisma.items.findFirst({
    where: {
      itemCode: +itemCode,
    },
    select: {
      itemCode: true,
      itemName: true,
      itemPrice: true,
      itemStat: {
        select: {
          health: true,
          power: true,
        },
      },
    },
  });

  if (!item) {
    return res.status(404).json({
      message: '존재하지 않는 아이템입니다.',
    });
  }

  return res.status(200).json({ data: item });
});

export default router;
