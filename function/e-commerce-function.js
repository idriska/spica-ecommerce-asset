import * as Bucket from "@spica-devkit/bucket";
const APIKEY = process.env.ECOMMERCE_APIKEY;

// Buckets
const PRODUCT_BUCKET = process.env.PRODUCT_BUCKET;
const STOCK_BUCKET = process.env.STOCK_BUCKET;
const BASKET_BUCKET = process.env.BASKET_BUCKET;
const USED_COUPON_BUCKET = process.env.USED_COUPON_BUCKET;

Bucket.initialize({ apikey: APIKEY });

export async function orderInserted(change) {
  const target = change.current;
  const basketId = target.basket;

  if (!basketId) {
    return;
  }

  const basketData = await Bucket.data.get(BASKET_BUCKET, basketId).catch(err => console.log("ERROR ", err))

  updateStockQuantity(basketData);
  updateBasketStatus(basketId);
  updateUsedCoupon(basketData);

  return
}

export async function updateBasketPrice(change) {
  const target = change.current;

  const productIds = target.product;
  let totalPrice = 0;
  const now = new Date();

  if (!productIds.length) {
    return;
  }

  const products = await Bucket.data.getAll(PRODUCT_BUCKET, {
    queryParams: { filter: { _id: { $in: productIds } } },
  }).catch(err => console.log("ERROR ", err))


  for (const product of products) {
    let discount_start_date = new Date(product.discount_start_date);
    let discount_end_date = new Date(product.discount_end_date);

    if (product.discounted_price && discount_start_date < now && discount_end_date > now) {
      totalPrice += product.discounted_price;
    } else {
      totalPrice += product.normal_price;
    }
  }

  return Bucket.data.patch(BASKET_BUCKET, target._id, { total_price: totalPrice }).catch(err => console.log("ERROR", err))
}

async function updateStockQuantity(basketData) {
  const products = basketData.product;
  const promises = [];

  const stocks = await Bucket.data.getAll(STOCK_BUCKET, {
    queryParams: { filter: { product: { $in: products } } },
  }).catch(err => console.log("ERROR ", err))

  for (const stock of stocks) {
    if (stock.is_enable) {
      let newQuantity = Math.max(stock.quantity - 1, 0)
      promises.push(
        Bucket.data.patch(STOCK_BUCKET, stock._id, { quantity: newQuantity })
      );
    }
  }

  return Promise.all(promises);
}

function updateBasketStatus(basketId) {
  return Bucket.data.patch(BASKET_BUCKET, basketId, { is_completed: true })
}

function updateUsedCoupon(basketData) {
  if (!basketData.user || !basketData.coupon) {
    return
  }

  let insertedData = {
    title: "Coupon Used",
    coupon: basketData.coupon,
    user: basketData.user,
    date: new Date()
  }

  return Bucket.data.insert(USED_COUPON_BUCKET, insertedData).catch(err => console.log("ERROR ", err))

}