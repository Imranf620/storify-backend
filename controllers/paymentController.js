import catchAsyncError from "../middleware/catchAsyncErrors.js";
import apiResponse from "../utils/apiResponse.js";
import prisma from "../utils/prisma.js";
import stripe from "stripe";


export const getPricing = catchAsyncError(async(req,res,next) => {

    const pricing = await prisma.pricing.findFirst()
    console.log(pricing)
    if(!pricing) {
        return apiResponse(false, "Pricing not found", null, 404, res);
    }
    return apiResponse(true, "Pricing fetched successfully", pricing, 200, res);
})

export const updatePackage = catchAsyncError(async (req, res, next) => {

  const { userId, days, uploadSpeed, downloadSpeed, storage, paymentToken } = req.body;

  if (!userId || !days || !uploadSpeed || !downloadSpeed || !storage || !paymentToken) {
    return apiResponse(false, "required parameter missing", null, 400, res);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return apiResponse(false, "User not found", null, 404, res);
  }
  const pricing = {
    perDay: 2,
    perMbps: 0.75,
    perGbStorage: 0.5,
  };

  const totalPrice = 
    days * pricing.perDay +
    (uploadSpeed + downloadSpeed) * pricing.perMbps +
    storage * pricing.perGbStorage;

  try {
    // Create a payment intent with the calculated price
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalPrice * 100, // Convert to cents
      currency: "usd",
      payment_method: paymentToken,
      confirmation_method: "manual",
      confirm: true,
    });

    if (paymentIntent.status === "succeeded") {
      // Update user package details in the database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          subscribedAt: new Date(),
          validDays: days,
          uploadSpeed,
          downloadSpeed,
          totalStorage: storage,
        },
      });

      // Log the payment details in the database
      const payment = await prisma.payment.create({
        data: {
          userId: userId,
          amount: totalPrice,
          paymentMethod: "Stripe",
          status: "Success",
          transactionId: paymentIntent.id,
        },
      });

      return apiResponse(true, "Package updated successfully", { user: updatedUser, payment }, 200, res);
    } else {
      return apiResponse(false, "Payment failed", null, 400, res);
    }
  } catch (error) {
    return apiResponse(false, "Error processing payment", null, 500, res);
  }
});
