import sqlite3 from "sqlite3";
import { Sequelize, DataTypes, Op } from "sequelize";
import { FoodPlan, Note, Task, Recipe, RecipeCategory } from "../lib/db.js";

const db = new sqlite3.Database("../old.db");

// Migrate the old content into the new database structure, one table at a time.

// db.all("SELECT * FROM `days`", (err, result) => {
//   if (err) {
//     console.log("ERROR!", err);
//   }
//   console.log(result);
//   result.forEach((record) => {
//     FoodPlan.create({
//       date: new Date(record.date),
//       breakfast: record.breakfast,
//       lunch: record.lunch,
//       dinner: record.dinner,
//     });
//   });
// });

// db.all("SELECT * FROM `notes`", (err, result) => {
//   if (err) {
//     console.log("ERROR!", err);
//   }
//   console.log(result);
//   result.forEach((record) => {
//     Note.create({
//       date: new Date(record.date),
//       content: record.content,
//     });
//   });
// });

// db.all("SELECT * FROM `recipe_categories`", (err, result) => {
//   if (err) {
//     console.log("ERROR!", err);
//   }
//   console.log(result);
//   result.forEach((record) => {
//     RecipeCategory.create({
//       name: record.name,
//       id: record.id,
//     });
//   });
// });

// db.all("SELECT * FROM `recipes`", (err, result) => {
//   if (err) {
//     console.log("ERROR!", err);
//   }
//   console.log(result);
//   result.forEach(async (record) => {
//     const recipe = await Recipe.create({
//       url: record.url,
//       domain: record.domain,
//       title: record.title,
//       description: record.description,
//       image: record.image,
//     });
//     const associatedCategory = await RecipeCategory.findByPk(
//       record.category_id
//     );
//     recipe.setRecipeCategory(associatedCategory);
//   });
// });

// db.all("SELECT * FROM `shopping`", (err, result) => {
//   if (err) {
//     console.log("ERROR!", err);
//   }
//   console.log(result);
//   result.forEach((record) => {
//     Task.create({
//       date: new Date(record.date),
//       content: record.content,
//       done: record.done,
//       type: "shopping",
//     });
//   });
// });

// db.all("SELECT * FROM `todos`", (err, result) => {
//   if (err) {
//     console.log("ERROR!", err);
//   }
//   console.log(result);
//   result.forEach((record) => {
//     Task.create({
//       date: new Date(record.date),
//       content: record.content,
//       done: record.done,
//       type: "food-task",
//     });
//   });
// });
