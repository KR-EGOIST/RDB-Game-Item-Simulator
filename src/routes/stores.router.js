import express from 'express';
import { userPrisma } from '../utils/prisma/userClient.js';
import { itemPrisma } from '../utils/prisma/itemClient.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { compareSync } from 'bcrypt';

const router = express.Router();

/* 아이템 구입 API  */
router.post(
  '/characters/:characterId/stores',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { characterId } = req.params;
      const { buy } = req.body;

      const character = await userPrisma.characters.findFirst({
        where: {
          UserId: +userId,
          characterId: +characterId,
        },
      });

      if (!character) {
        return res.status(404).json({
          message: '존재하지 않는 캐릭터입니다.',
        });
      }

      let totalPrice = 0;
      for (const goods of buy) {
        const item = await itemPrisma.items.findFirst({
          where: {
            itemCode: +goods.item_code,
          },
        });

        if (!item) {
          return res.status(404).json({
            message: '존재하지 않는 아이템입니다.',
          });
        }

        totalPrice = totalPrice + +goods.count * item.itemPrice;
      }

      if (totalPrice > character.money) {
        return res.status(403).json({
          message: '잔액이 부족합니다.',
        });
      }

      for (const goods of buy) {
        const inven = await userPrisma.inventorys.findFirst({
          where: {
            CharacterId: character.characterId,
            ItemCode: +goods.item_code,
          },
        });

        if (!inven) {
          await userPrisma.inventorys.create({
            data: {
              CharacterId: character.characterId,
              ItemCode: +goods.item_code,
              count: +goods.count,
            },
          });
        } else {
          await userPrisma.inventorys.update({
            where: {
              inventoryId: inven.inventoryId,
              CharacterId: character.characterId,
              ItemCode: +goods.item_code,
            },
            data: {
              count: +goods.count + inven.count,
            },
          });
        }
      }

      await userPrisma.characters.update({
        where: {
          characterId: +characterId,
          UserId: +userId,
        },
        data: {
          money: character.money - totalPrice,
        },
      });

      const data = await userPrisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
        select: {
          characterId: true,
          name: true,
          money: true,
          inventory: {
            select: {
              ItemCode: true,
              count: true,
            },
          },
        },
      });

      return res.status(200).json({ data: data });
    } catch (err) {
      next(err);
    }
  }
);

/* 아이템 판매 API */
router.patch(
  '/characters/:characterId/stores',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { characterId } = req.params;
      const { sell } = req.body;

      const character = await userPrisma.characters.findFirst({
        where: {
          UserId: +userId,
          characterId: +characterId,
        },
      });

      if (!character) {
        return res.status(404).json({
          message: '존재하지 않는 캐릭터입니다.',
        });
      }

      let totalPrice = 0;
      for (const goods of sell) {
        const item = await itemPrisma.items.findFirst({
          where: {
            itemCode: +goods.item_code,
          },
        });

        if (!item) {
          return res.status(404).json({
            message: '존재하지 않는 아이템입니다.',
          });
        }

        totalPrice =
          totalPrice + +goods.count * Math.round(item.itemPrice * 0.6);
      }

      for (const goods of sell) {
        const inven = await userPrisma.inventorys.findFirst({
          where: {
            CharacterId: character.characterId,
            ItemCode: +goods.item_code,
          },
        });

        if (!inven) {
          return res.status(404).json({
            message: `인벤토리에 ${goods.item_code} 아이템이 없습니다.`,
          });
        } else if (inven.count - +goods.count < 0) {
          return res.status(404).json({
            message: `인벤토리에 ${goods.item_code} 아이템이 부족합니다.`,
          });
        } else {
          await userPrisma.inventorys.update({
            where: {
              inventoryId: inven.inventoryId,
              CharacterId: character.characterId,
              ItemCode: +goods.item_code,
            },
            data: {
              count: inven.count - +goods.count,
            },
          });
        }
      }

      for (const goods of sell) {
        const inven = await userPrisma.inventorys.findFirst({
          where: {
            CharacterId: character.characterId,
            ItemCode: +goods.item_code,
          },
        });

        if (inven.count === 0) {
          await userPrisma.inventorys.delete({
            where: {
              inventoryId: inven.inventoryId,
              CharacterId: character.characterId,
              ItemCode: +goods.item_code,
            },
          });
        }
      }

      await userPrisma.characters.update({
        where: {
          characterId: +characterId,
          UserId: +userId,
        },
        data: {
          money: character.money + totalPrice,
        },
      });

      const data = await userPrisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
        select: {
          characterId: true,
          name: true,
          money: true,
          inventory: {
            select: {
              ItemCode: true,
              count: true,
            },
          },
        },
      });

      return res.status(200).json({ data: data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
