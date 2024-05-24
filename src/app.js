import express from 'express';
import cookieParser from 'cookie-parser';
import LogMiddleware from './middlewares/log.middleware.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import UsersRouter from './routes/users.router.js';
import CharactersRouter from './routes/characters.router.js';
import ItemsRouter from './routes/items.router.js';
import StoresRouter from './routes/stores.router.js';

const app = express();
const PORT = 3018;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());

app.use('/api', [UsersRouter, CharactersRouter, ItemsRouter, StoresRouter]);

app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
