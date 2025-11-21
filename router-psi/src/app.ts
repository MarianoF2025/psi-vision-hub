import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { webhookRouter } from './routes/webhook';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes/api';
import { webhookRateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { Logger } from './utils/logger';
import { Env } from './config/environment';

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => Logger.info(message.trim()),
    },
  })
);

app.use(webhookRateLimiter);
app.use(healthRouter);
app.use(webhookRouter);
app.use(apiRouter);

app.use(errorHandler);

const port = Env.port;

app.listen(port, () => {
  Logger.info(`Router PSI escuchando en puerto ${port}`);
});

export default app;






