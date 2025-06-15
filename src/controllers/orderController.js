import asyncHandler from "express-async-handler";
import Order from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";

// Create new order
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalAmount,
    guestDetails,
  } = req.body;

  if (items && items.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  //Inventory Management
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Không tìm thấy sản phẩm với ID: ${item.product}`);
    }
    if (product.countInStock < item.quantity) {
      res.status(400);
      throw new Error(
        `Sản phẩm "${product.name}" không đủ hàng. Trong kho chỉ còn ${product.countInStock} sản phẩm.`
      );
    }
  }

  const orderData = {
    items,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalAmount,
  };

  if (req.user) {
    orderData.user = req.user._id;
  } else {
    if (!guestDetails || !guestDetails.email || !guestDetails.fullName) {
      res.status(400);
      throw new Error(
        "Guest email and full name are required for guest checkout"
      );
    }
    orderData.guestDetails = guestDetails;
  }

  const order = new Order(orderData);
  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

// Get order by ID
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    if (order.user._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You are not authorized to view this order");
    }
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// Update order to paid
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.paymentStatus = "paid";
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.countInStock -= item.quantity;
        await product.save();
      }
    }
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// Get logged in user orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

//update order to delivered
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

export {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  updateOrderToDelivered,
};
