const Category = require('../models/categories.model')

exports.addCategories = async (req, res, next) =>{
    try {
        const { name } = req.body;

        // Check if the category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).send('Category already exists.');
        }

        // Create a new category
        const category = new Category({ name });
        await category.save();

        res.status(201).send({ message: 'Category created successfully', category });
    } catch (error) {
        next(error)
    }
}
exports.editCategories = async (req, res, next) =>{
    try {
        const categoryId = req.params.id;
        const { newName } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found.');
        }

        category.name = newName;
        await category.save();

        res.send({ message: 'Category updated successfully', category });
    } catch (error) {
        next(error)
    }
}

exports.deleteCategories = async (req, res, next) =>{
    try {
        const categoryId = req.params.id;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found.');
        }

        await category.remove();
        res.send({ message: 'Category deleted successfully' });
    } catch (error) {
        next(error)
    }
}
exports.getCategories = async (req, res, next) =>{
    try {
        const categories = await Category.find({});
        res.send(categories);
    } catch (error) {
        next(error)
    }
}