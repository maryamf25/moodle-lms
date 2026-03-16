'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getUserId } from '@/app/(auth)/login/actions';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || (IS_PRODUCTION ? '27315' : '27315');
const SECURED_KEY = process.env.PAYFAST_SECURED_KEY || (IS_PRODUCTION ? 'ZqyCrJzLAzosYGMH7ahpp81DK-' : 'ZqyCrJzLAzosYGMH7ahpp81DK-');

const DEFAULT_TOKEN_URL = IS_PRODUCTION
  ? 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken'
  : 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken';
const DEFAULT_PAYFAST_URL = IS_PRODUCTION
  ? 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction'
  : 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction';

const TOKEN_URL = process.env.PAYFAST_TOKEN_URL || process.env.TOKEN_URL || DEFAULT_TOKEN_URL;
const PAYFAST_URL = process.env.PAYFAST_URL || DEFAULT_PAYFAST_URL;

function isDnsResolutionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: unknown; cause?: unknown };

  const directCode = typeof maybeError.code === 'string' ? maybeError.code : '';
  if (directCode === 'ENOTFOUND' || directCode === 'EAI_AGAIN') return true;

  if (!maybeError.cause || typeof maybeError.cause !== 'object') return false;
  const causeCode = typeof (maybeError.cause as { code?: unknown }).code === 'string'
    ? (maybeError.cause as { code?: string }).code
    : '';

  return causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN';
}

export async function enrollExistingUser(courseId: number, amount: number) {
  const cookieStore = await cookies();
  const moodleToken = cookieStore.get('moodle_token')?.value;
  if (!moodleToken) return { error: 'Not logged in' };

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: 'Invalid amount' };
  }

  const payableAmount = Math.max(1, Math.round(numericAmount));

  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("TOKEN_URL:", TOKEN_URL);
  console.log("PAYFAST_URL:", PAYFAST_URL);
  try {
    // 1️⃣ Get User ID
    const userId = await getUserId(moodleToken);

    // 2️⃣ Generate Basket/Order ID
    const bId = `INV${courseId}${userId}${Date.now()}`;

    const transAmount = payableAmount.toString();

    // 3️⃣ Get Access Token from PayFast
    const authRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        merchant_id: MERCHANT_ID,
        secured_key: SECURED_KEY,
        grant_type: 'client_credentials',
        basket_id: bId,
        txnamt: transAmount,
        currency_code: 'PKR'
      })
    });

    if (!authRes.ok) {
      throw new Error(`PayFast token request failed: ${authRes.status} ${authRes.statusText}`);
    }

    const authData = await authRes.json();
    const accessTokenRaw = authData.ACCESS_TOKEN || authData.access_token || authData.TOKEN;
    const accessToken = typeof accessTokenRaw === 'string' ? accessTokenRaw.trim() : '';
    if (!accessToken) {
      const description = authData.errorDescription || authData.message || 'Failed to get PayFast Access Token';
      throw new Error(description);
    }

    // 4️⃣ Prepare payload (do NOT send to PayFast yet)
    const now = new Date();
    const pktDate = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000);
    const orderDate = pktDate.toISOString().slice(0, 19).replace('T', ' ');

    const hashString = `${MERCHANT_ID}${bId}${orderDate}${transAmount}`;
    const signature = crypto.createHmac('sha256', SECURED_KEY)
      .update(hashString)
      .digest('hex')
      .toUpperCase();

    const successUrl = `${process.env.NEXT_PUBLIC_URL}/payment-success?basketId=${bId}&courseId=${courseId}`;
    const failureUrl = `${process.env.NEXT_PUBLIC_URL}/payment-error`;

    const paymentData = {
      MERCHANT_ID,
      merchant_id: MERCHANT_ID,
      BASKET_ID: bId,
      basket_id: bId,
      ORDER_DATE: orderDate,
      order_date: orderDate,
      TXNAMT: transAmount,
      txnamt: transAmount,
      SIGNATURE: signature,
      signature,
      TOKEN: accessToken,
      token: accessToken,
      PROCCODE: '00',
      proccode: '00',
      TRAN_TYPE: 'ECOMM_PURCHASE',
      tran_type: 'ECOMM_PURCHASE',
      CURRENCY_CODE: 'PKR',
      currency_code: 'PKR',
      SUCCESS_URL: successUrl,
      success_url: successUrl,
      FAILURE_URL: failureUrl,
      failure_url: failureUrl,
      CUSTOMER_MOBILE_NO: '03001234567',
      customer_mobile_no: '03001234567',
      CUSTOMER_EMAIL_ADDRESS: 'test@example.com',
      customer_email_address: 'test@example.com',
      CHECKOUT_JS: '1',
      checkout_js: '1',
    };

    return { paymentData, actionUrl: PAYFAST_URL, basketId: bId };
  } catch (err: any) {
    if (isDnsResolutionError(err)) {
      const tokenHost = new URL(TOKEN_URL).host;
      console.error('Enroll Error: PayFast host DNS lookup failed', { tokenHost });
      return {
        error: `Unable to resolve payment gateway host (${tokenHost}). Please verify PAYFAST_TOKEN_URL/PAYFAST_URL and local DNS/network settings.`
      };
    }

    console.error('Enroll Error:', err);
    return { error: err.message || 'Enrollment initialization failed' };
  }
}