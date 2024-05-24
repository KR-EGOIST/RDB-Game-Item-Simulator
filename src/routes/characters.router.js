import express from 'express';
import jwt from 'jsonwebtoken';
import { userPrisma } from '../utils/prisma/userClient.js';
import { itemPrisma } from '../utils/prisma/itemClient.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/* 캐릭터 생성 API */
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

/* 캐릭터 삭제 API */
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

/* 캐릭터 상세 조회 API */
router.get('/characters/:characterId', async (req, res, next) => {
  const { characterId } = req.params;
  const authorization = req.header('authorization');

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

/* 캐릭터가 보유한 인벤토리 내 아이템 목록 조회 API */
router.get(
  '/characters/:characterId/inventorys',
  authMiddleware,
  async (req, res, next) => {
    const { userId } = req.user;
    const { characterId } = req.params;

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
    }

    const findInvenItem = await userPrisma.inventorys.findMany({
      where: {
        CharacterId: +characterId,
      },
      select: {
        ItemCode: true,
      },
      orderBy: {
        ItemCode: 'asc',
      },
    });

    const inventoryItem = findInvenItem.map(({ ItemCode }) => ItemCode);
    const item = await itemPrisma.items.findMany({
      where: {
        itemCode: {
          in: inventoryItem,
        },
      },
      select: {
        itemCode: true,
        itemName: true,
      },
      orderBy: {
        itemCode: 'asc',
      },
    });

    const inventory = await userPrisma.inventorys.findMany({
      where: {
        CharacterId: +characterId,
      },
      select: {
        ItemCode: true,
        count: true,
      },
      orderBy: {
        ItemCode: 'asc',
      },
    });

    const data = [];
    for (let i = 0; i < inventory.length; i++) {
      const temp = {
        itemCode: item[i].itemCode,
        itemName: item[i].itemName,
        count: inventory[i].count,
      };
      data.push(temp);
    }

    return res.status(200).json({ data: data });
  }
);

/* 아이템 장착 API */
router.post(
  '/characters/:characterId/equip',
  authMiddleware,
  async (req, res, next) => {
    const { userId } = req.user;
    const { characterId } = req.params;
    const { item_code } = req.body;

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
    }

    const inven = await userPrisma.inventorys.findFirst({
      where: {
        CharacterId: +characterId,
        ItemCode: item_code,
      },
    });

    if (!inven) {
      return res.status(404).json({
        message: `인벤토리에 ItemCode : ${item_code} 아이템은 없습니다.`,
      });
    }

    const findEquipItem = await userPrisma.equips.findFirst({
      where: {
        CharacterId: +characterId,
        ItemCode: item_code,
      },
    });
    if (findEquipItem) {
      return res.status(409).json({
        message: '이미 장착한 아이템입니다.',
      });
    }

    await userPrisma.equips.create({
      data: {
        CharacterId: +characterId,
        ItemCode: item_code,
      },
    });

    await userPrisma.inventorys.update({
      where: {
        inventoryId: inven.inventoryId,
        CharacterId: +characterId,
        ItemCode: item_code,
      },
      data: {
        count: inven.count - 1,
      },
    });

    if (inven.count === 0) {
      await userPrisma.inventorys.delete({
        where: {
          inventoryId: inven.inventoryId,
          CharacterId: +characterId,
          ItemCode: item_code,
        },
      });
    }

    const equipItem = await itemPrisma.itemStats.findFirst({
      where: {
        ItemCode: item_code,
      },
    });

    if (equipItem.health) {
      await userPrisma.characters.update({
        where: {
          characterId: +characterId,
          UserId: +userId,
        },
        data: {
          health: character.health + equipItem.health,
        },
      });
    }

    if (equipItem.power) {
      await userPrisma.characters.update({
        where: {
          characterId: +characterId,
          UserId: +userId,
        },
        data: {
          power: character.power + equipItem.power,
        },
      });
    }

    const data = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
      select: {
        name: true,
        health: true,
        power: true,
        equip: {
          select: {
            ItemCode: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: '아이템을 장착했습니다.',
      data: data,
    });
  }
);

/* 아이템 탈착 API */
router.patch(
  '/characters/:characterId/equip',
  authMiddleware,
  async (req, res, next) => {
    const { userId } = req.user;
    const { characterId } = req.params;
    const { item_code } = req.body;

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
    }

    const findEquipItem = await userPrisma.equips.findFirst({
      where: {
        CharacterId: +characterId,
        ItemCode: item_code,
      },
    });

    if (!findEquipItem) {
      return res.status(404).json({
        message: `ItemCode : ${item_code} 아이템을 장착하지 않았습니다.`,
      });
    }

    await userPrisma.equips.delete({
      where: {
        equipId: findEquipItem.equipId,
        CharacterId: +characterId,
        ItemCode: item_code,
      },
    });

    const equipItem = await itemPrisma.itemStats.findFirst({
      where: {
        ItemCode: item_code,
      },
    });

    await userPrisma.characters.update({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
      data: {
        health: character.health - equipItem.health,
        power: character.power - equipItem.power,
      },
    });

    const inven = await userPrisma.inventorys.findFirst({
      where: {
        CharacterId: +characterId,
        ItemCode: item_code,
      },
    });

    if (inven) {
      await userPrisma.inventorys.update({
        where: {
          inventoryId: inven.inventoryId,
          CharacterId: +characterId,
          ItemCode: item_code,
        },
        data: {
          count: inven.count + 1,
        },
      });
    } else {
      await userPrisma.inventorys.create({
        data: {
          CharacterId: +characterId,
          ItemCode: item_code,
          count: 1,
        },
      });
    }

    const data = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
      select: {
        name: true,
        health: true,
        power: true,
        equip: {
          select: {
            ItemCode: true,
          },
        },
      },
    });

    return res
      .status(200)
      .json({ message: '아이템을 해제했습니다.', data: data });
  }
);

/* 캐릭터가 장착한 아이템 목록 조회 API */
router.get('/characters/:characterId/equip', async (req, res, next) => {
  const { characterId } = req.params;

  const character = await userPrisma.characters.findFirst({
    where: {
      characterId: +characterId,
    },
  });

  const equip = await userPrisma.equips.findMany({
    where: {
      CharacterId: +characterId,
    },
    select: {
      ItemCode: true,
    },
    orderBy: {
      ItemCode: 'asc',
    },
  });

  const data = await itemPrisma.items.findMany({
    where: {
      itemCode: {
        in: equip.map(({ ItemCode }) => ItemCode),
      },
    },
    select: {
      itemCode: true,
      itemName: true,
    },
    orderBy: {
      itemCode: 'asc',
    },
  });

  return res
    .status(200)
    .json({ message: `${character.name}의 장비창`, data: data });
});

/* 게임 머니를 버는 API */
router.patch(
  '/characters/:characterId/showmethemoney',
  authMiddleware,
  async (req, res, next) => {
    const { userId } = req.user;
    const { characterId } = req.params;

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
    }

    await userPrisma.characters.update({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
      data: {
        money: character.money + 100,
      },
    });

    const data = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
        UserId: +userId,
      },
      select: {
        name: true,
        money: true,
      },
    });

    return res.status(200).json({
      message: '게임 머니를 100원 얻었습니다.',
      data: data,
    });
  }
);

export default router;
