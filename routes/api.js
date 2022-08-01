import express from 'express';
const router = express.Router();

import urlExist from "url-exist";
import linkPreviewGenerator from "link-preview-generator";

import Database from 'better-sqlite3';
const db = new Database('haus.db');

router.get('/week', function(req, res) {
  const rows = db.prepare("SELECT * FROM days WHERE DATE(date) >= DATE(?, 'weekday 0', '-6 days') AND DATE(date) <= DATE(?, 'weekday 0', '-6 days', '+6 days')").all(req.query.date, req.query.date);
  res.json(rows);
});

router.get('/day', function(req, res) {
  const rows = db.prepare("SELECT * FROM days WHERE DATE(date) == ?").all(req.query.date);
  res.json(rows[0]);
});

router.post('/day', function(req, res) {
  const result = db.prepare("INSERT INTO days(date, breakfast, lunch, dinner) VALUES(?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET breakfast=coalesce(excluded.breakfast, breakfast), lunch=coalesce(excluded.lunch, lunch), dinner=coalesce(excluded.dinner, dinner)").run(req.body.date, req.body.breakfast, req.body.lunch, req.body.dinner);

  res.send({ message: 'Data posted successfully.' });
});

router.get('/notes', function(req, res) {
  const rows = db.prepare("SELECT * FROM notes WHERE DATE(date) >= DATE(?, 'weekday 0', '-6 days') AND DATE(date) <= DATE(?, 'weekday 0', '-6 days', '+6 days')").get(req.query.date, req.query.date);
  res.json(rows);
});

router.post('/notes', function(req, res) {
  const result = db.prepare("INSERT INTO notes(date, content) VALUES(?, ?) ON CONFLICT(date) DO UPDATE SET content=coalesce(excluded.content, content)").run(req.body.date, req.body.content);

  res.send({ message: 'Data posted successfully.' });
});

router.get('/todo', (req, res) => {
  const rows = db.prepare("SELECT * FROM todos WHERE DATE(date) >= DATE(?, 'weekday 0', '-6 days') AND DATE(date) <= DATE(?, 'weekday 0', '-6 days', '+6 days')").all(req.query.date, req.query.date);
  res.json(rows);
});

router.post('/todo', function(req, res) {
  const result = db.prepare("INSERT INTO todos(content, done, date) VALUES(?, ?, ?)").run(req.body.content, +req.body.done, req.body.date);

  console.log(result);

  res.send({ message: 'Data posted successfully.', id: result.lastInsertRowid });
});

router.put('/todo', (req, res) => {
  const result = db.prepare("UPDATE todos SET done=? WHERE id=?").run(+req.body.done, req.body.id); 

  res.send({ message: 'Data posted successfully.' });
});

router.delete('/todo', (req, res) => {
  const result = db.prepare("DELETE FROM todos WHERE id=?").run(req.query.id);

  res.send({ message: 'Data posted successfully.' });
});

router.get('/shopping', (req, res) => {
  const rows = db.prepare("SELECT * FROM shopping WHERE DATE(date) >= DATE(?, 'weekday 0', '-6 days') AND DATE(date) <= DATE(?, 'weekday 0', '-6 days', '+6 days')").all(req.query.date, req.query.date);
  res.json(rows);
});

router.post('/shopping', function(req, res) {
  const result = db.prepare("INSERT INTO shopping(content, done, date) VALUES(?, ?, ?)").run(req.body.content, +req.body.done, req.body.date);

  console.log(result);

  res.send({ message: 'Data posted successfully.', id: result.lastInsertRowid });
});

router.put('/shopping', (req, res) => {
  const result = db.prepare("UPDATE shopping SET done=? WHERE id=?").run(+req.body.done, req.body.id); 

  res.send({ message: 'Data posted successfully.' });
});

router.delete('/shopping', (req, res) => {
  const result = db.prepare("DELETE FROM shopping WHERE id=?").run(req.query.id);

  res.send({ message: 'Data posted successfully.' });
});

router.get('/recipe', (req, res) => {
  const rows = db.prepare("SELECT * FROM recipes").all();
  res.json(rows);
});

router.post('/recipe', async function(req, res) {
  const urlExists = await urlExist(req.body.url.trim());

  if (!urlExists) {
    return res.send({ error: 'URL is not valid.' });
  }

  try {
    const previewData = await linkPreviewGenerator(req.body.url.trim());
    console.log(previewData);

    const result = db.prepare("INSERT INTO recipes(url, title, description, image, domain, category_id) VALUES(?, ?, ?, ?, ?, ?)").run(req.body.url.trim(), previewData.title, previewData.description, previewData.img, previewData.domain, req.body.category);

    console.log(result);

    res.send({ message: 'Data posted successfully.', record: { id: result.lastInsertRowid, url: req.body.url, category_id: req.body.category, ...previewData, image: previewData.img } });
  } catch {
    res.send({ error: 'URL is not valid.' });
  }
});

router.delete('/recipe', (req, res) => {
  const result = db.prepare("DELETE FROM recipes WHERE id=?").run(req.query.id);

  res.send({ message: 'Data posted successfully.' });
});

router.get('/recipe-category', (req, res) => {
  const rows = db.prepare("SELECT * FROM recipe_categories").all();
  res.json(rows);
});

router.post('/recipe-category', function(req, res) {
  const result = db.prepare("INSERT INTO recipe_categories(name) VALUES(?)").run(req.body.name);

  console.log(result);

  res.send({ message: 'Data posted successfully.', id: result.lastInsertRowid });
});

router.delete('/recipe-category', (req, res) => {
  const result = db.prepare("DELETE FROM recipe_categories WHERE id=?").run(req.query.id);

  res.send({ message: 'Data posted successfully.' });
});

export default router;
