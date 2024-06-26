import express from "express";
import urlExist from "url-exist";
import getMetaData from "metadata-scraper";
import { startOfWeek, endOfWeek } from "date-fns";

import callAuth0Api from "../lib/auth0.js";
import { Sequelize, DataTypes, Op } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "haus.db",
});
const FoodPlan = sequelize.define("FoodPlan", {
  date: { type: DataTypes.DATE, allowNull: false, unique: true },
  breakfast: DataTypes.TEXT,
  lunch: DataTypes.TEXT,
  dinner: DataTypes.TEXT,
});
const Note = sequelize.define("Note", {
  date: { type: DataTypes.DATE, allowNull: false, unique: true },
  content: DataTypes.TEXT,
});
const Task = sequelize.define("Task", {
  date: { type: DataTypes.DATE, allowNull: false },
  content: DataTypes.TEXT,
  done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  type: { type: DataTypes.STRING, allowNull: false },
  person: DataTypes.STRING,
  dueDate: DataTypes.DATE,
});
const RecipeCategory = sequelize.define("RecipeCategory", {
  name: DataTypes.STRING,
  order: DataTypes.NUMBER,
});
const Recipe = sequelize.define("Recipe", {
  description: DataTypes.TEXT,
  domain: DataTypes.STRING,
  image: DataTypes.STRING,
  title: DataTypes.STRING,
  url: DataTypes.STRING,
});
RecipeCategory.hasMany(Recipe);
Recipe.belongsTo(RecipeCategory);
const Reminder = sequelize.define("Reminder", {
  // Acts as the 'start date' from which to calculate repeating reminders
  date: { type: DataTypes.DATE, allowNull: false },
  content: DataTypes.TEXT,
  isRepeating: DataTypes.BOOLEAN,
  person: DataTypes.STRING,
  repeatUnit: {
    type: DataTypes.ENUM("day", "week", "month"),
    allowNull: false,
  },
  repeatInterval: DataTypes.INTEGER, // Repeat every N units
});
const RecipeIdea = sequelize.define("RecipeIdea", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  body: DataTypes.TEXT,
});

const MainIngredient = sequelize.define("MainIngredient", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
});

const RecipeTag = sequelize.define("RecipeTag", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
});

RecipeCategory.hasMany(RecipeIdea);
RecipeIdea.belongsTo(RecipeCategory);

RecipeIdea.belongsToMany(MainIngredient, { through: 'RecipeIdeaIngredients' });
MainIngredient.belongsToMany(RecipeIdea, { through: 'RecipeIdeaIngredients' });

RecipeIdea.belongsToMany(RecipeTag, { through: 'RecipeIdeaTags' });
RecipeTag.belongsToMany(RecipeIdea, { through: 'RecipeIdeaTags' });

// await sequelize.sync();

export { FoodPlan, Note, Task, Recipe, RecipeCategory };

const router = express.Router();

// Helper function to find or create tags and ingredients
async function findOrCreateItems(items, Model) {
  return Promise.all(items.map(item =>
    Model.findOrCreate({ where: { name: item } })
      .then(([record]) => record)
  ));
}

// Helper function to cleanup orphaned items
async function cleanupOrphanedItems(items, Model) {
  for (const item of items) {
    const transaction = await sequelize.transaction();
    try {
      const record = await Model.findByPk(item.id, { transaction });
      if (record) {
        const associatedRecipes = await record.getRecipeIdeas({ transaction });
        if (associatedRecipes.length === 0) {
          await record.destroy({ transaction });
        }
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error(`Error cleaning up orphaned ${Model.name}:`, error);
    }
  }
}


const pick = (obj, keys) =>
  keys
    .map((k) => (k in obj ? { [k]: obj[k] } : {}))
    .reduce((res, o) => Object.assign(res, o), {});

router.get("/food-plan", async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const foodPlans = await FoodPlan.findAll({
    where: {
      date: {
        [Op.between]: [
          startOfWeek(date, { weekStartsOn: 1 }),
          endOfWeek(date, { weekStartsOn: 1 }),
        ],
      },
    },
  });
  res.json(foodPlans);
});

router.post("/food-plan", async (req, res) => {
  await FoodPlan.upsert(
    {
      date: req.body.date,
      breakfast: req.body.breakfast,
      lunch: req.body.lunch,
      dinner: req.body.dinner,
    },
    {
      where: {
        date: req.body.date,
      },
    }
  );

  res.send({ message: "Data posted successfully." });
});

router.get("/note", async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  // For notes, the start of the week is Sunday and the end is Saturday.
  const s = startOfWeek(date);
  const e = endOfWeek(date);
  const notes = await Note.findOne({
    where: {
      date: {
        [Op.between]: [s, e],
      },
    },
  });
  res.json(notes);
});

router.post("/note", async (req, res) => {
  await Note.upsert(
    {
      date: req.body.date,
      content: req.body.content,
    },
    {
      where: {
        date: req.body.date,
      },
    }
  );

  res.send({ message: "Data posted successfully." });
});

// Handles all task types (food, shopping, and general)
router.get("/task", async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : false;
  // For tasks, the start of the week is Monday and the end is Sunday.
  const tasks = await Task.findAll({
    where: date
      ? {
        date: {
          [Op.between]: [startOfWeek(date), endOfWeek(date)],
        },
        type: req.query.type,
      }
      : { type: req.query.type },
  });
  res.json(tasks);
});

router.post("/task", async (req, res) => {
  const task = await Task.create({
    date: req.body.date,
    content: req.body.content,
    done: req.body.done,
    person: req.body.person,
    type: req.body.type,
    dueDate: req.body.dueDate,
  });

  res.send({
    message: "Data posted successfully.",
    id: task.id,
  });
});

router.put("/task", async (req, res) => {
  await Task.update(
    {
      date: req.body.date,
      content: req.body.content,
      done: req.body.done,
      person: req.body.person,
      type: req.body.type,
      dueDate: req.body.dueDate,
    },
    {
      where: {
        id: req.body.id,
      },
    }
  );

  res.send({ message: "Data posted successfully." });
});

router.delete("/task", async (req, res) => {
  await Task.destroy({ where: { id: req.query.id } });

  res.send({ message: "Data posted successfully." });
});

router.get("/user/:id?", async (req, res) => {
  try {
    const response = await callAuth0Api({
      endpoint: req.params.id ? `users/${req.params.id}` : "users",
    });
    if (!Array.isArray(response)) {
      const user = {
        email: response.email,
        name: response.name,
        given_name: response.given_name,
        family_name: response.family_name,
        id: response.user_id,
      };
      return res.json(user);
    }
    const users = response.map((user) => ({
      email: user.email,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      id: user.user_id,
    }));
    return res.json(users);
  } catch (error) {
    return res
      .status(500)
      .send({ error: "Unexpected error retrieving users." });
  }
});

router.put("/user/:id", async (req, res) => {
  const data = pick(req.body, ["given_name", "family_name"]);
  try {
    await callAuth0Api({
      method: "PATCH",
      endpoint: `users/${req.params.id}`,
      data,
    });
    res.send({ message: "User updated sucessfully." });
  } catch (error) {
    res.status(500).send({ error: "Unexpected error updating user." });
  }
});

router.get("/recipe", async (req, res) => {
  const recipes = await Recipe.findAll();
  res.json(recipes);
});

router.post("/recipe", async (req, res) => {
  const urlExists = await urlExist(req.body.url.trim());

  if (!urlExists) {
    return res.send({ error: "URL is not valid." });
  }

  try {
    const previewData = await getMetaData(req.body.url.trim());
    console.log(previewData);

    const recipe = await Recipe.create({
      url: req.body.url.trim(),
      title: previewData.title,
      description: previewData.description,
      image: previewData.image,
      domain: new URL(req.body.url.trim()).hostname.replace("www.", ""),
    });
    const associatedCategory = await RecipeCategory.findByPk(req.body.category);
    if (associatedCategory) {
      recipe.setRecipeCategory(associatedCategory);
    }

    return res.send({
      message: "Data posted successfully.",
      record: recipe,
    });
  } catch (error) {
    console.log(error);
    return res.send({ error: "Unexpected error adding recipe." });
  }
});

router.delete("/recipe", async (req, res) => {
  await Recipe.destroy({ where: { id: req.query.id } });
  res.send({ message: "Data posted successfully." });
});

router.get("/recipe-category", async (req, res) => {
  const categories = await RecipeCategory.findAll();
  res.json(categories);
});

router.post("/recipe-category", async (req, res) => {
  const category = await RecipeCategory.create({
    name: req.body.name,
  });

  res.send({
    message: "Data posted successfully.",
    id: category.id,
  });
});

router.delete("/recipe-category", async (req, res) => {
  await RecipeCategory.destroy({ where: { id: req.query.id } });
  res.send({ message: "Data posted successfully." });
});

router.get("/reminder", async (req, res) => {
  const reminders = await Reminder.findAll();
  res.json(reminders);
});

router.post("/reminder", async (req, res) => {
  const reminder = await Reminder.create({
    date: req.body.date,
    content: req.body.content,
    isRepeating: req.body.isRepeating,
    repeatUnit: req.body.repeatUnit,
    repeatInterval: req.body.repeatInterval, // Repeat every N units
  });
  res.send({
    message: "Data posted successfully.",
    id: reminder.id,
  });
});

router.put("/reminder", async (req, res) => {
  // await Task.update(
  //   {
  //     date: req.body.date,
  //     content: req.body.content,
  //     done: req.body.done,
  //     person: req.body.person,
  //     type: req.body.type,
  //     dueDate: req.body.dueDate,
  //   },
  //   {
  //     where: {
  //       id: req.body.id,
  //     },
  //   }
  // );
  // res.send({ message: "Data posted successfully." });
});

router.delete("/reminder", async (req, res) => {
  // await Task.destroy({ where: { id: req.query.id } });
  // res.send({ message: "Data posted successfully." });
});

// GET all recipe ideas with optional filtering
router.get("/recipe-ideas", async (req, res) => {
  try {
    const { tags, ingredients, search, category } = req.query;
    let where = {};
    let recipeIdeasIds = null;

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    if (category) {
      where.RecipeCategoryId = category;
    }

    // If tags or ingredients are specified, we need to filter the RecipeIdeas first
    if (tags || ingredients) {
      let tagWhere = {};
      let ingredientWhere = {};

      if (tags) {
        tagWhere = { name: { [Op.in]: tags.split(',') } };
      }

      if (ingredients) {
        ingredientWhere = { name: { [Op.in]: ingredients.split(',') } };
      }

      // Find IDs of RecipeIdeas that match the tag and ingredient filters
      const filteredIds = await RecipeIdea.findAll({
        attributes: ['id'],
        where,
        include: [
          tags ? { model: RecipeTag, where: tagWhere, attributes: [] } : null,
          ingredients ? { model: MainIngredient, where: ingredientWhere, attributes: [] } : null
        ].filter(Boolean),
        raw: true
      });

      recipeIdeasIds = filteredIds.map(idea => idea.id);

      // If no recipes match the filters, return an empty array early
      if (recipeIdeasIds.length === 0) {
        return res.json([]);
      }

      // Add the filtered IDs to the where clause
      where.id = { [Op.in]: recipeIdeasIds };
    }

    // Now fetch the full RecipeIdea data including all tags and ingredients
    const recipeIdeas = await RecipeIdea.findAll({
      where,
      include: [
        {
          model: RecipeCategory,
          attributes: ['id', 'name']
        },
        {
          model: RecipeTag,
          attributes: ['id', 'name'],
          through: { attributes: [] }
        },
        {
          model: MainIngredient,
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ],
      attributes: ['id', 'name', 'body', 'RecipeCategoryId']
    });

    res.json(recipeIdeas);
  } catch (error) {
    console.error('Error fetching recipe ideas:', error);
    res.status(500).json({ error: "Error fetching recipe ideas" });
  }
});

// POST a new recipe idea
router.post("/recipe-ideas", async (req, res) => {
  try {
    const { name, RecipeCategoryId, MainIngredients, RecipeTags, body } = req.body;
    console.log(req.body);

    const recipeIdea = await RecipeIdea.create({ name, body, RecipeCategoryId });

    if (MainIngredients) {
      const mainIngredientsToArrayOfStrings = MainIngredients.map(ingredient => ingredient.name);
      const ingredientRecords = await findOrCreateItems(mainIngredientsToArrayOfStrings, MainIngredient);
      await recipeIdea.setMainIngredients(ingredientRecords);
    }

    if (RecipeTags) {
      const tagsToArrayOfStrings = RecipeTags.map(tag => tag.name);
      const tagRecords = await findOrCreateItems(tagsToArrayOfStrings, RecipeTag);
      await recipeIdea.setRecipeTags(tagRecords);
    }

    res.status(201).json(recipeIdea);
  } catch (error) {
    console.error('Error creating recipe idea:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: "Recipe idea with this name already exists" });
    } else {
      res.status(500).json({ error: "Error creating recipe idea" });
    }
  }
});

// PUT (update) a recipe idea
router.put("/recipe-ideas/:id", async (req, res) => {
  const { name, RecipeCategoryId, MainIngredients, RecipeTags, body } = req.body;
  console.log(req.body);

  try {
    const recipeIdea = await RecipeIdea.findByPk(req.params.id, {
      include: [RecipeTag, MainIngredient]
    });

    if (!recipeIdea) {
      return res.status(404).json({ error: "Recipe idea not found" });
    }

    // Perform the main update
    await recipeIdea.update({ name, body, RecipeCategoryId });

    // Update ingredients
    if (MainIngredients) {
      const mainIngredientsToArrayOfStrings = MainIngredients.map(ingredient => ingredient.name);
      const ingredientRecords = await findOrCreateItems(mainIngredientsToArrayOfStrings, MainIngredient);
      await recipeIdea.setMainIngredients(ingredientRecords);
    }

    // Update tags
    if (RecipeTags) {
      const tagsToArrayOfStrings = RecipeTags.map(tag => tag.name);
      const tagRecords = await findOrCreateItems(tagsToArrayOfStrings, RecipeTag);
      await recipeIdea.setRecipeTags(tagRecords);
    }

    // Fetch the updated recipe idea
    const updatedRecipeIdea = await RecipeIdea.findByPk(req.params.id, {
      include: [RecipeTag, MainIngredient]
    });

    // Perform cleanup operations asynchronously
    const currentIngredients = recipeIdea.MainIngredients;
    const currentTags = recipeIdea.RecipeTags;
    const newIngredientIds = updatedRecipeIdea.MainIngredients.map(i => i.id);
    const newTagIds = updatedRecipeIdea.RecipeTags.map(t => t.id);

    const removedIngredients = currentIngredients.filter(i => !newIngredientIds.includes(i.id));
    const removedTags = currentTags.filter(t => !newTagIds.includes(t.id));

    cleanupOrphanedItems(removedIngredients, MainIngredient).catch(console.error);
    cleanupOrphanedItems(removedTags, RecipeTag).catch(console.error);

    res.json(updatedRecipeIdea);
  } catch (error) {
    console.error('Error updating recipe idea:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: "Recipe idea with this name already exists" });
    } else {
      res.status(500).json({ error: "Error updating recipe idea" });
    }
  }
});

// DELETE a recipe idea
router.delete("/recipe-ideas/:id", async (req, res) => {
  try {
    const recipeIdea = await RecipeIdea.findByPk(req.params.id);

    if (!recipeIdea) {
      return res.status(404).json({ error: "Recipe idea not found" });
    }

    await recipeIdea.destroy();
    res.json({ message: "Recipe idea deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting recipe idea" });
  }
});

// GET all recipe tags
router.get("/recipe-tags", async (req, res) => {
  try {
    const tags = await RecipeTag.findAll();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: "Error fetching recipe tags" });
  }
});

// GET all main ingredients
router.get("/main-ingredients", async (req, res) => {
  try {
    const ingredients = await MainIngredient.findAll();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: "Error fetching main ingredients" });
  }
});

export default router;
