const mongoose = require("mongoose");

const fileHelper = require("../util/file");

const Book = require("../models/book");
const User = require("../models/user");

exports.getBooks = async (req, res, next) => {
  try {
    const books = await Book.find()
      .select("_id title imageUrl description author year creator")
      .populate("creator")
      .exec();
    const response = {
      count: books.length,
      data: books.map((book) => {
        return {
          _id: book._id,
          title: book.title,
          imageUrl: book.imageUrl,
          description: book.description,
          year: book.year,
          creator: {
            email: book.creator.email,
          },
          request: {
            type: "GET",
            url: "http://localhost:3000/api/book/" + book._id,
          },
        };
      }),
    };
    res.status(200).json(response);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.createBook = async (req, res, next) => {
  if (!req.file) {
    const error = new Error("No image provided!");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const imageUrl = req.file.path;
  const description = req.body.description;
  const author = req.body.author;
  const year = req.body.year;
  let creator;
  const book = new Book({
    _id: new mongoose.Types.ObjectId(),
    title: title,
    imageUrl: imageUrl,
    description: description,
    author: author,
    year: year,
    creator: req.userId,
  });
  try {
    const result = await book.save();
    const user = await User.findById(req.userId);
    creator = user;
    user.books.push(book);
    await user.save();
    res.status(201).json({
      message: "Book created successfully!",
      data: {
        _id: result._id,
        title: result.title,
        imageUrl: result.imageUrl,
        description: result.description,
        author: result.author,
        year: result.year,
        creator: {
          _id: creator._id,
          email: creator.email,
        },
        request: {
          type: "GET",
          url: "http://localhost:3000/api/book/" + result._id,
        },
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getBook = async (req, res, next) => {
  const bookId = req.params.bookId;
  try {
    const book = await Book.findById(bookId)
      .populate("creator")
      .select("_id title imageUrl description author year creator");
    if (book) {
      res.status(200).json({
        message: "Book fetced successfully",
        data: {
          _id: book._id,
          title: book.title,
          imageUrl: book.imageUrl,
          description: book.description,
          author: book.author,
          year: book.year,
          creator: {
            email: book.creator.email,
          },
        },
      });
    } else {
      res.status(404).json({ message: "No valid book with the ID." });
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.updateBook = async (req, res, next) => {
  const bookId = req.params.bookId;
  const title = req.body.title;
  const image = req.file;
  const description = req.body.description;
  const author = req.body.author;
  const year = req.body.year;
  let imageUrl;
  try {
    const book = await Book.findById(bookId);
    if (!book) {
      const error = new Error("No book found!");
      error.statusCode = 404;
      throw error;
    }
    if (book.creator.toString() !== req.userId) {
      const error = new Error("Not authorized!");
      error.statusCode = 403;
      throw error;
    }
    if (image) {
      imageUrl = image.path;
      if (imageUrl !== book.imageUrl) {
        fileHelper.deleteFile(book.imageUrl);
      }
      book.imageUrl = imageUrl;
    }
    book.title = title;
    book.description = description;
    book.author = author;
    book.year = year;
    const result = await book.save();
    res
      .status(200)
      .json({ message: "Book updated successfully!", book: result });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.deleteBook = async (req, res, next) => {
  const bookId = req.params.bookId;
  try {
    const book = await Book.findById(bookId);
    if (!book) {
      const error = new Error("No book found!");
      error.statusCode = 404;
      throw error;
    }
    if (book.creator.toString() !== req.userId) {
      const error = new Error("Not authorized!");
      error.statusCode = 403;
      throw error;
    }
    fileHelper.deleteFile(book.imageUrl);
    await Book.deleteOne({ _id: bookId });
    const user = await User.findById(req.userId);
    user.books.pull(bookId);
    await user.save();
    res.status(200).json({
      message: "Book deleted successfully!",
      result: { _id: bookId },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
