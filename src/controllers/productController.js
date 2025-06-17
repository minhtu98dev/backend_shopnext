import asyncHandler from "express-async-handler";
import Product from "../models/ProductModel.js";

// Get all products
const getProducts = asyncHandler(async (req, res) => {
  // --- 1. LẤY CÁC THAM SỐ TỪ QUERY STRING ---
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.pageNumber) || 1;

  // --- 2. XÂY DỰNG CÁC ĐIỀU KIỆN TRUY VẤN ---

  // Điều kiện cho Tìm kiếm (Search)
  const keywordFilter = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "i", // không phân biệt chữ hoa/thường
        },
      }
    : {};

  // Điều kiện cho Lọc (Filter)
  const categoryFilter = req.query.category
    ? { category: req.query.category }
    : {};

  // Điều kiện cho Sắp xếp (Sort)
  const sortOrder = {};
  if (req.query.sortBy === "price") {
    sortOrder.price = req.query.order === "desc" ? -1 : 1;
  } else if (req.query.sortBy === "name") {
    sortOrder.name = req.query.order === "desc" ? -1 : 1;
  } else {
    sortOrder.createdAt = -1; // Mặc định: sản phẩm mới nhất
  }

  // Gộp các điều kiện lọc và tìm kiếm lại
  const filterConditions = { ...keywordFilter, ...categoryFilter };

  // --- 3. THỰC THI CÁC TRUY VẤN SONG SONG ĐỂ TỐI ƯU ---

  const [count, products, availableCategories] = await Promise.all([
    // Truy vấn 1: Đếm tổng số sản phẩm khớp điều kiện
    Product.countDocuments(filterConditions),

    // Truy vấn 2: Tìm sản phẩm khớp điều kiện, áp dụng sắp xếp và phân trang
    Product.find(filterConditions)
      .sort(sortOrder)
      .limit(pageSize)
      .skip(pageSize * (page - 1)),

    // Truy vấn 3: Lấy danh sách tất cả các danh mục duy nhất có trong DB
    Product.distinct("category", {}), // filter rỗng để lấy tất cả
  ]);

  // --- 4. TRẢ VỀ KẾT QUẢ HOÀN CHỈNH ---

  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
    availableCategories, // <-- Dữ liệu mới được thêm vào
  });
});

// Get product by ID
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// create review
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("Product already reviewed");
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// Admin: Delete product
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// Admin: Create product
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    description,
    image,
    images,
    brand,
    category,
    countInStock,
  } = req.body;

  const product = new Product({
    name,
    price,
    user: req.user._id,
    image,
    images,
    brand,
    category,
    countInStock,
    description,
    numReviews: 0,
    rating: 0,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// Admin: Update product
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    description,
    image,
    images,
    brand,
    category,
    countInStock,
  } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name;
    product.price = price;
    product.description = description;
    product.image = image;
    product.images = images;
    product.brand = brand;
    product.category = category;
    product.countInStock = countInStock;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

export {
  getProducts,
  getProductById,
  createProductReview,
  deleteProduct,
  createProduct,
  updateProduct,
};
