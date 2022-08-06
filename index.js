import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import apiRouter from './routes/api.js';

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/v1', apiRouter);

console.log(`Running in ${process.env.NODE_ENV}`);

app.listen(port, () => {
  console.log(`Haus server listening on port ${port}`);
});
