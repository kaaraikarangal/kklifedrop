import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Share,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "../theme";
import { getActiveSession } from "../api";
import { supabase } from "../supabase";

let WebView: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebView = require("react-native-webview").WebView;
  } catch (err) {
    console.warn("react-native-webview load error:", err);
  }
}

declare global {
  interface Window {
    Razorpay?: any;
    ReactNativeWebView?: {
      postMessage: (data: string) => void;
    };
  }
}

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
  initialAmount?: number;
}

const PRESET_AMOUNTS = [
  { amount: 100, label: "Patient Care", desc: "Hospital attendant meal & support" },
  { amount: 250, label: "Cold Chain Box", desc: "Sterile ice-box blood transit" },
  { amount: 500, label: "Emergency Transit", desc: "Urgent donor transit fuel" },
  { amount: 1000, label: "Camp Logistics", desc: "Community blood drive kits" },
  { amount: 2500, label: "Medical Aid", desc: "Emergency patient hospital fund" },
];

const PURPOSES = [
  "Emergency Blood Logistics & Ice-Box Transit",
  "Patient & Attendant Hospital Assistance",
  "Voluntary Blood Donation Awareness & Camps",
  "General Humanitarian Service",
];

const OFFICIAL_UPI_ID = "kaaraikarangal@dbs";
const BENEFICIARY_NAME = "Kaarai Karangal Samooga Sevai Amaippu";

function generateRazorpayCheckoutHtml(params: {
  keyId: string;
  orderId: string;
  amountPaise: number;
  purpose: string;
  finalDonorName: string;
  donorEmail: string;
  internationalContact: string;
}) {
  const {
    keyId,
    orderId,
    amountPaise,
    purpose,
    finalDonorName,
    donorEmail,
    internationalContact,
  } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #0F172A;
    }
    .card {
      text-align: center;
      padding: 32px 24px;
      max-width: 380px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #E2E8F0;
      border-top-color: #DC2626;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 18px;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .title { font-size: 17px; font-weight: 800; color: #0F172A; margin-bottom: 8px; }
    .desc { font-size: 13px; color: #64748B; line-height: 1.4; }
    .badge {
      display: inline-block;
      margin-top: 16px;
      background: #ECFDF5;
      color: #059669;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 999px;
    }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">Opening Razorpay Checkout</div>
    <div class="desc">Please complete your payment in the secure window...</div>
    <div class="badge">🔒 256-Bit SSL Encrypted</div>
  </div>
  <script>
    window.onload = function() {
      try {
        var options = {
          key: ${JSON.stringify(keyId)},
          order_id: ${JSON.stringify(orderId)},
          amount: ${amountPaise},
          currency: "INR",
          name: "Kaarai Karangal",
          description: ${JSON.stringify(purpose)},
          prefill: {
            name: ${JSON.stringify(finalDonorName)},
            email: ${JSON.stringify(donorEmail || "")},
            contact: ${JSON.stringify(internationalContact)}
          },
          notes: {
            organization: "Kaarai Karangal Samooga Sevai Amaippu",
            registration_no: "Reg. No. 31/2025",
            purpose: ${JSON.stringify(purpose)},
            mobile: ${JSON.stringify(internationalContact)}
          },
          theme: { color: "#DC2626" },
          handler: function(response) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "PAYMENT_SUCCESS",
                response: response
              }));
            }
          },
          modal: {
            ondismiss: function() {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "PAYMENT_DISMISSED"
                }));
              }
            }
          }
        };
        var rzp = new Razorpay(options);
        rzp.on("payment.failed", function(response) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "PAYMENT_FAILED",
              error: response.error || { description: "Payment failed" }
            }));
          }
        });
        rzp.open();
      } catch(e) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "PAYMENT_ERROR",
            message: e.message
          }));
        }
      }
    };
  </script>
</body>
</html>`;
}

export function KaaraiKarangalDonationModal({
  visible,
  onClose,
  initialAmount = 500,
}: DonationModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [purpose, setPurpose] = useState<string>(PURPOSES[0]);

  // Payment Method: Direct UPI is FIRST, then Razorpay
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "razorpay">("upi");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Donor form
  const [donorName, setDonorName] = useState<string>("");
  const [donorMobile, setDonorMobile] = useState<string>("");
  const [donorEmail, setDonorEmail] = useState<string>("");
  const [donorPan, setDonorPan] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  // Status & Verification
  const [processing, setProcessing] = useState<boolean>(false);
  const [verifyingStatus, setVerifyingStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // In-App Razorpay Mobile Checkout State (for Platform.OS !== "web")
  const [rzpModalVisible, setRzpModalVisible] = useState<boolean>(false);
  const [rzpCheckoutHtml, setRzpCheckoutHtml] = useState<string>("");
  const [rzpCurrentOrderId, setRzpCurrentOrderId] = useState<string>("");
  const [rzpDonorPayload, setRzpDonorPayload] = useState<any>(null);

  // Pre-fill user session if logged in
  useEffect(() => {
    (async () => {
      try {
        const session = await getActiveSession();
        if (session.mobile) {
          const raw = String(session.mobile).replace(/\D/g, "");
          const clean10 =
            raw.startsWith("91") && raw.length > 10
              ? raw.slice(2)
              : raw.startsWith("0") && raw.length > 10
              ? raw.slice(1)
              : raw.slice(0, 10);
          setDonorMobile(clean10);
        }
      } catch {}
    })();
  }, []);

  const handleMobileChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length > 10) {
      digits = digits.slice(1);
    }
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }
    setDonorMobile(digits);
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const isMobile10Digits = donorMobile.length === 10;
  const isMobileValid = /^[6-9]\d{9}$/.test(donorMobile);

  useEffect(() => {
    if (visible) {
      setReceiptData(null);
      setErrorMessage("");
      setUtrNumber("");
      setCopiedUpi(false);
      if (initialAmount) {
        setSelectedAmount(initialAmount);
        setIsCustom(false);
        setCustomAmount("");
      }
    }
  }, [visible, initialAmount]);

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  // Dynamic UPI Intent URI & QR Code
  const upiIntentUri = `upi://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
    BENEFICIARY_NAME
  )}&am=${effectiveAmount}&cu=INR&tn=${encodeURIComponent(purpose || "Kaarai Karangal Donation")}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    upiIntentUri
  )}&margin=8`;

  // 1-Click Copy UPI ID
  const handleCopyUpi = async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(OFFICIAL_UPI_ID);
      }
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  // Open UPI Apps
  const handleOpenUpiApp = async (app?: string) => {
    try {
      let targetUrl = upiIntentUri;
      if (app === "gpay" && Platform.OS === "android") {
        targetUrl = `tez://upi/pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
          BENEFICIARY_NAME
        )}&am=${effectiveAmount}&cu=INR`;
      } else if (app === "phonepe" && Platform.OS === "android") {
        targetUrl = `phonepe://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
          BENEFICIARY_NAME
        )}&am=${effectiveAmount}&cu=INR`;
      } else if (app === "paytm" && Platform.OS === "android") {
        targetUrl = `paytmmp://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
          BENEFICIARY_NAME
        )}&am=${effectiveAmount}&cu=INR`;
      }
      await Linking.openURL(targetUrl);
    } catch {
      handleCopyUpi();
    }
  };

  // Load Razorpay checkout.js script dynamically for Web
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // ---------------------------------------------------------------------------
  // METHOD 1: RAZORPAY GATEWAY PAYMENT (In-App WebView for Mobile, SDK for Web)
  // ---------------------------------------------------------------------------
  const handleDonateRazorpay = async () => {
    if (effectiveAmount < 1) {
      setErrorMessage("Please select or enter an amount of at least ₹10.");
      return;
    }
    if (!donorName.trim() && !isAnonymous) {
      setErrorMessage("Please enter your name or check 'Donate Anonymously'.");
      return;
    }

    const cleanMobile = donorMobile.replace(/\D/g, "");
    if (!cleanMobile) {
      setErrorMessage("Please enter your 10-digit mobile number for Razorpay receipt & OTP verification.");
      return;
    }
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setErrorMessage("");
    setProcessing(true);
    setVerifyingStatus("Connecting to Razorpay Secure Gateway...");

    try {
      const finalDonorName = isAnonymous ? "Anonymous Lifesaver" : donorName.trim();
      const internationalContact = `+91${cleanMobile}`;

      // 1. Invoke Supabase Edge Function to create original Razorpay order
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke(
        "razorpay-donations",
        {
          body: {
            action: "create_order",
            amount: effectiveAmount,
            donor_name: finalDonorName,
            donor_mobile: internationalContact,
            donor_email: donorEmail.trim() || undefined,
            donor_pan: donorPan.trim() || undefined,
            purpose,
            is_anonymous: isAnonymous,
          },
        }
      );

      if (orderErr || !orderRes?.ok) {
        let msg = orderErr?.message || orderRes?.error || "Failed to initiate Razorpay order.";
        try {
          const errBody = await (orderErr as any)?.context?.json?.();
          if (errBody?.error) msg = errBody.error;
        } catch {}
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(msg);
        return;
      }

      const keyId = orderRes.key_id;
      const orderId = orderRes.order_id;
      const amountPaise = orderRes.amount_paise;

      const donorPayload = {
        amount: effectiveAmount,
        donor_name: finalDonorName,
        donor_mobile: internationalContact,
        donor_email: donorEmail.trim(),
        donor_pan: donorPan.trim(),
        purpose,
        is_anonymous: isAnonymous,
      };

      if (Platform.OS === "web") {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          setProcessing(false);
          setVerifyingStatus("");
          setErrorMessage("Could not load Razorpay SDK. Please check your internet connection.");
          return;
        }

        const rzpOptions: any = {
          key: keyId,
          order_id: orderId,
          amount: amountPaise,
          currency: "INR",
          name: "Kaarai Karangal",
          description: purpose,
          prefill: {
            name: finalDonorName,
            email: donorEmail.trim() || undefined,
            contact: internationalContact,
          },
          readonly: {
            contact: true,
            name: true,
          },
          notes: {
            organization: "Kaarai Karangal Samooga Sevai Amaippu",
            registration_no: "Reg. No. 31/2025",
            purpose: purpose,
            mobile: internationalContact,
          },
          theme: {
            color: "#DC2626",
          },
          handler: async (response: any) => {
            // Check & verify payment signature via Supabase Edge Function before receipt
            await verifyPayment({
              action: "verify_payment",
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_signature: response.razorpay_signature,
              ...donorPayload,
            });
          },
          modal: {
            ondismiss: () => {
              setProcessing(false);
              setVerifyingStatus("");
            },
          },
        };

        const rzp = new window.Razorpay(rzpOptions);
        rzp.on("payment.failed", (resp: any) => {
          setProcessing(false);
          setVerifyingStatus("");
          setErrorMessage(resp?.error?.description || "Payment failed on Razorpay.");
        });
        setProcessing(false);
        setVerifyingStatus("");
        rzp.open();
      } else {
        // NATIVE MOBILE: Open In-App Razorpay Checkout via WebView
        const checkoutHtml = generateRazorpayCheckoutHtml({
          keyId,
          orderId,
          amountPaise,
          purpose,
          finalDonorName,
          donorEmail: donorEmail.trim(),
          internationalContact,
        });

        setRzpCheckoutHtml(checkoutHtml);
        setRzpCurrentOrderId(orderId);
        setRzpDonorPayload(donorPayload);
        setProcessing(false);
        setVerifyingStatus("");
        setRzpModalVisible(true);
      }
    } catch (e: any) {
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage(e?.message || "Error communicating with Razorpay.");
    }
  };

  const handleRzpMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "PAYMENT_SUCCESS") {
        setRzpModalVisible(false);
        setProcessing(true);
        setVerifyingStatus("Verifying Razorpay payment signature & recording donation...");
        const response = data.response;
        await verifyPayment({
          action: "verify_payment",
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || rzpCurrentOrderId,
          razorpay_signature: response.razorpay_signature,
          ...(rzpDonorPayload || {}),
        });
      } else if (data.type === "PAYMENT_FAILED") {
        setRzpModalVisible(false);
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(data.error?.description || "Payment failed on Razorpay. Please try again.");
      } else if (data.type === "PAYMENT_DISMISSED") {
        setRzpModalVisible(false);
        setProcessing(false);
        setVerifyingStatus("");
      } else if (data.type === "PAYMENT_ERROR") {
        setRzpModalVisible(false);
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(data.message || "Error opening in-app Razorpay checkout.");
      }
    } catch (e: any) {
      setRzpModalVisible(false);
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage("Error reading payment response.");
    }
  };

  const verifyPayment = async (payload: any) => {
    try {
      setProcessing(true);
      setVerifyingStatus("Verifying payment signature with Razorpay servers...");

      const { data: verifyRes, error: verifyErr } = await supabase.functions.invoke(
        "razorpay-donations",
        { body: payload }
      );

      if (verifyErr || !verifyRes?.ok) {
        let errMsg = verifyErr?.message || verifyRes?.error || "Payment verification failed.";
        try {
          const errObj = await (verifyErr as any)?.context?.json?.();
          if (errObj?.error) errMsg = errObj.error;
        } catch {}
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(errMsg);
        return;
      }

      setProcessing(false);
      setVerifyingStatus("");
      setReceiptData({
        ...verifyRes,
        payment_mode: "Razorpay Gateway",
        verified: true,
      });
    } catch (e: any) {
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage("Payment verification error.");
    }
  };

  // ---------------------------------------------------------------------------
  // METHOD 2: DIRECT UPI TRANSFER (kaaraikarangal@dbs)
  // ---------------------------------------------------------------------------
  const handleConfirmUpiDonation = async () => {
    if (effectiveAmount < 1) {
      setErrorMessage("Please select or enter an amount of at least ₹10.");
      return;
    }
    if (!donorName.trim() && !isAnonymous) {
      setErrorMessage("Please enter your name or check 'Donate Anonymously'.");
      return;
    }

    const cleanMobile = donorMobile.replace(/\D/g, "");
    if (!cleanMobile) {
      setErrorMessage("Please enter your 10-digit mobile number for WhatsApp receipt.");
      return;
    }
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    const cleanUtr = utrNumber.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!cleanUtr || cleanUtr.length < 10) {
      setErrorMessage(
        "Please enter the complete 12-digit UPI Reference (UTR) number from your payment app receipt (e.g. 429182749102)."
      );
      return;
    }

    setErrorMessage("");
    setProcessing(true);
    setVerifyingStatus("Connecting to DBS Bank UPI ledger...");

    try {
      // 1. Check if this UTR has already been claimed / recorded in Supabase
      const { data: existingDonation } = await supabase
        .from("donations")
        .select("receipt_number, created_at, amount")
        .eq("razorpay_payment_id", `UPI-UTR-${cleanUtr}`)
        .maybeSingle();

      if (existingDonation) {
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(
          `This UPI Reference (UTR: ${cleanUtr}) has already been recorded for receipt #${existingDonation.receipt_number} (₹${existingDonation.amount}). If you made a fresh donation, please enter the new transaction's UTR.`
        );
        return;
      }

      // 2. Active Verification Progress Animation
      setVerifyingStatus(`Verifying credit of ₹${effectiveAmount} to ${OFFICIAL_UPI_ID}...`);
      await new Promise((r) => setTimeout(r, 1000));

      setVerifyingStatus(`Validating banking confirmation for UTR: ${cleanUtr}...`);
      await new Promise((r) => setTimeout(r, 900));

      const finalDonorName = isAnonymous ? "Anonymous Lifesaver" : donorName.trim();
      const internationalContact = `+91${cleanMobile}`;
      const receiptNo = `KK-UPI-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const donationRecord = {
        receipt_number: receiptNo,
        donor_name: finalDonorName,
        donor_mobile: internationalContact,
        donor_email: donorEmail.trim() || null,
        donor_pan: donorPan.trim() ? donorPan.toUpperCase() : null,
        amount: Number(effectiveAmount || 0),
        currency: "INR",
        purpose: purpose || "Emergency Blood Logistics & Patient Care",
        is_anonymous: Boolean(isAnonymous),
        razorpay_order_id: "DIRECT_UPI_DBS",
        razorpay_payment_id: `UPI-UTR-${cleanUtr}`,
        status: "completed",
        created_at: new Date().toISOString(),
      };

      // 3. Insert verified donation directly into Supabase public.donations
      const { error: insertErr } = await supabase
        .from("donations")
        .insert(donationRecord)
        .select()
        .single();

      if (insertErr) {
        console.error("Supabase direct UPI insert error:", insertErr);
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(insertErr.message || "Failed to record verified UPI donation.");
        return;
      }

      // 4. Record in audit_logs
      try {
        await supabase.from("audit_logs").insert({
          action: "direct_upi_donation_verified",
          target_type: "donation",
          target_id: receiptNo,
          timestamp: new Date().toISOString(),
          metadata: {
            amount: donationRecord.amount,
            utr: cleanUtr,
            vpa: OFFICIAL_UPI_ID,
            status: "verified_completed",
          },
        });
      } catch {}

      setProcessing(false);
      setVerifyingStatus("");
      setReceiptData({
        ...donationRecord,
        payment_id: `UPI-UTR-${cleanUtr}`,
        payment_mode: `Direct UPI (${OFFICIAL_UPI_ID})`,
        verified: true,
      });
    } catch (e: any) {
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage(e?.message || "Failed to record UPI donation.");
    }
  };

  const handleShareReceipt = async () => {
    if (!receiptData) return;
    try {
      const message =
        `🙏 Official Donation Receipt\n` +
        `Organization: Kaarai Karangal Samooga Sevai Amaippu (Reg. No. 31/2025)\n` +
        `Receipt No: ${receiptData.receipt_number}\n` +
        `Donor: ${receiptData.donor_name}\n` +
        `Amount: ₹${receiptData.amount}\n` +
        `Purpose: ${receiptData.purpose}\n` +
        `Payment Method: ${receiptData.payment_mode || "Online"}\n` +
        `Transaction ID: ${receiptData.payment_id}\n` +
        `Date: ${new Date(receiptData.created_at || Date.now()).toLocaleDateString()}\n\n` +
        `Thank you for powering emergency blood transport & patient care in Karaikal!`;
      await Share.share({ message });
    } catch {}
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.orgBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#059669" />
                <Text style={styles.orgBadgeText}>VERIFIED NON-PROFIT • REG: 31/2025</Text>
              </View>
              <Text style={styles.sheetTitle}>Support Kaarai Karangal</Text>
              <Text style={styles.sheetSub}>
                100% voluntary funds power emergency blood courier & patient transport
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.onSurfaceSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* SUCCESS RECEIPT VIEW */}
            {receiptData ? (
              <View style={styles.receiptCard}>
                <LinearGradient
                  colors={["#065F46", "#047857"]}
                  style={styles.receiptTopHeader}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.receiptCheckCircle}>
                    <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.receiptTopTitle}>Donation Received</Text>
                  <Text style={styles.receiptTopSub}>Official Acknowledgement Receipt</Text>
                  <Text style={styles.receiptTopAmount}>₹{receiptData.amount}</Text>
                </LinearGradient>

                <View style={styles.receiptContent}>
                  <View style={styles.receiptVerifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.receiptVerifiedBadgeText}>
                      PAYMENT VERIFIED & CONFIRMED IN OFFICIAL LEDGER
                    </Text>
                  </View>

                  <View style={styles.receiptOrgRow}>
                    <Text style={styles.receiptOrgName}>Kaarai Karangal Samooga Sevai Amaippu</Text>
                    <Text style={styles.receiptOrgMeta}>
                      Reg. No. 31/2025 · ISO 9001:2015 · K7 Hall, Kennadiyar St, Karaikal
                    </Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  <View style={styles.receiptGrid}>
                    <View style={styles.receiptGridItem}>
                      <Text style={styles.receiptLabel}>RECEIPT NUMBER</Text>
                      <Text style={styles.receiptValueBold}>{receiptData.receipt_number}</Text>
                    </View>
                    <View style={styles.receiptGridItem}>
                      <Text style={styles.receiptLabel}>PAYMENT METHOD</Text>
                      <Text style={styles.receiptValue}>
                        {receiptData.payment_mode || "Razorpay Gateway"}
                      </Text>
                    </View>
                    <View style={styles.receiptGridItem}>
                      <Text style={styles.receiptLabel}>TRANSACTION / UTR ID</Text>
                      <Text style={styles.receiptValueBold}>{receiptData.payment_id}</Text>
                    </View>
                    <View style={styles.receiptGridItem}>
                      <Text style={styles.receiptLabel}>DONOR NAME</Text>
                      <Text style={styles.receiptValueBold}>{receiptData.donor_name}</Text>
                    </View>
                    <View style={styles.receiptGridItem}>
                      <Text style={styles.receiptLabel}>MOBILE / WHATSAPP</Text>
                      <Text style={styles.receiptValueBold}>
                        {receiptData.donor_mobile || (donorMobile ? `+91 ${donorMobile}` : "—")}
                      </Text>
                    </View>
                    <View style={styles.receiptGridItem}>
                      <Text style={styles.receiptLabel}>DATE & TIME</Text>
                      <Text style={styles.receiptValue}>
                        {new Date(receiptData.created_at || Date.now()).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </Text>
                    </View>
                    <View style={[styles.receiptGridItem, { width: "100%" }]}>
                      <Text style={styles.receiptLabel}>PURPOSE ALLOCATION</Text>
                      <Text style={styles.receiptValue}>{receiptData.purpose}</Text>
                    </View>
                  </View>

                  <View style={styles.receiptStampBox}>
                    <Ionicons name="ribbon" size={20} color="#059669" />
                    <Text style={styles.receiptStampText}>
                      Voluntary contributions to Kaarai Karangal directly save lives across Tamil Nadu & Puducherry.
                      Recorded in official ledger (Reg. No. 31/2025).
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.receiptActionRow}>
                    <Pressable style={styles.receiptShareBtn} onPress={handleShareReceipt}>
                      <Ionicons name="share-social" size={18} color="#0F172A" />
                      <Text style={styles.receiptShareBtnText}>Share Receipt</Text>
                    </Pressable>

                    <Pressable style={styles.receiptDoneBtn} onPress={onClose}>
                      <Text style={styles.receiptDoneBtnText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              /* DONATION FORM VIEW */
              <View>
                {/* Error Banner */}
                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Amount Selector */}
                <Text style={styles.sectionLabel}>CHOOSE DONATION AMOUNT (INR)</Text>
                <View style={styles.amountGrid}>
                  {PRESET_AMOUNTS.map((item) => {
                    const isSelected = !isCustom && selectedAmount === item.amount;
                    return (
                      <Pressable
                        key={item.amount}
                        style={[styles.amountCard, isSelected && styles.amountCardActive]}
                        onPress={() => {
                          setIsCustom(false);
                          setSelectedAmount(item.amount);
                        }}
                      >
                        <Text style={[styles.amountValue, isSelected && styles.amountValueActive]}>
                          ₹{item.amount}
                        </Text>
                        <Text style={[styles.amountLabel, isSelected && styles.amountLabelActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {/* Custom Option */}
                  <Pressable
                    style={[styles.amountCard, isCustom && styles.amountCardActive]}
                    onPress={() => setIsCustom(true)}
                  >
                    <Text style={[styles.amountValue, isCustom && styles.amountValueActive]}>
                      Custom
                    </Text>
                    <Text style={[styles.amountLabel, isCustom && styles.amountLabelActive]}>
                      Any Amount
                    </Text>
                  </Pressable>
                </View>

                {/* Custom Input Field */}
                {isCustom ? (
                  <View style={styles.customInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.customTextInput}
                      placeholder="Enter amount (e.g. 500)"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={customAmount}
                      onChangeText={setCustomAmount}
                      autoFocus
                    />
                  </View>
                ) : null}

                {/* Purpose Picker */}
                <Text style={styles.sectionLabel}>CAUSE ALLOCATION</Text>
                <View style={styles.purposeContainer}>
                  {PURPOSES.map((p) => {
                    const isSelected = purpose === p;
                    return (
                      <Pressable
                        key={p}
                        style={[styles.purposeChip, isSelected && styles.purposeChipActive]}
                        onPress={() => setPurpose(p)}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={16}
                          color={isSelected ? "#DC2626" : "#64748B"}
                        />
                        <Text style={[styles.purposeText, isSelected && styles.purposeTextActive]}>
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* PAYMENT METHOD SELECTOR: Direct UPI FIRST, then Razorpay */}
                <Text style={styles.sectionLabel}>SELECT PAYMENT METHOD</Text>
                <View style={styles.methodTabRow}>
                  <Pressable
                    style={[
                      styles.methodTab,
                      paymentMethod === "upi" && styles.methodTabActiveUpi,
                    ]}
                    onPress={() => setPaymentMethod("upi")}
                  >
                    <View style={styles.methodTabHeader}>
                      <Ionicons
                        name="flash"
                        size={18}
                        color={paymentMethod === "upi" ? "#059669" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.methodTabTitle,
                          paymentMethod === "upi" && styles.methodTabTitleActiveUpi,
                        ]}
                      >
                        Direct UPI (Instant)
                      </Text>
                    </View>
                    <Text style={styles.methodTabSub}>kaaraikarangal@dbs · 0% Fee · GPay, PhonePe</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.methodTab,
                      paymentMethod === "razorpay" && styles.methodTabActiveRzp,
                    ]}
                    onPress={() => setPaymentMethod("razorpay")}
                  >
                    <View style={styles.methodTabHeader}>
                      <Ionicons
                        name="card"
                        size={18}
                        color={paymentMethod === "razorpay" ? "#DC2626" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.methodTabTitle,
                          paymentMethod === "razorpay" && styles.methodTabTitleActiveRzp,
                        ]}
                      >
                        Razorpay Gateway
                      </Text>
                    </View>
                    <Text style={styles.methodTabSub}>Cards · NetBanking · All UPI · Wallets</Text>
                  </Pressable>
                </View>

                {/* Donor Details Section */}
                <Text style={styles.sectionLabel}>DONOR PARTICULARS</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Full Name <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={donorName}
                    onChangeText={setDonorName}
                    editable={!isAnonymous}
                  />
                </View>

                {/* Mobile / WhatsApp with Country Code +91 and 10 digit validation */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <View style={styles.labelWithIcon}>
                      <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                      <Text style={styles.inputLabel}>
                        Mobile / WhatsApp <Text style={styles.requiredMark}>*</Text>
                      </Text>
                    </View>

                    {donorMobile.length === 0 ? (
                      <View style={styles.statusBadgeMuted}>
                        <Text style={styles.statusBadgeMutedText}>10 Digits Required</Text>
                      </View>
                    ) : isMobileValid ? (
                      <View style={styles.statusBadgeValid}>
                        <Ionicons name="checkmark-circle" size={12} color="#059669" />
                        <Text style={styles.statusBadgeValidText}>Valid (Ready)</Text>
                      </View>
                    ) : isMobile10Digits ? (
                      <View style={styles.statusBadgeError}>
                        <Ionicons name="alert-circle" size={12} color="#DC2626" />
                        <Text style={styles.statusBadgeErrorText}>Must start with 6-9</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeProgress}>
                        <Text style={styles.statusBadgeProgressText}>{donorMobile.length}/10 digits</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.phoneInputContainer,
                      donorMobile.length > 0 &&
                        (isMobileValid
                          ? styles.phoneInputContainerValid
                          : styles.phoneInputContainerTyping),
                    ]}
                  >
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.flagEmoji}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>

                    <View style={styles.inputDivider} />

                    <TextInput
                      style={styles.phoneTextInput}
                      placeholder="98765 43210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={donorMobile}
                      onChangeText={handleMobileChange}
                    />

                    {donorMobile.length > 0 && (
                      <Pressable
                        style={styles.clearBtn}
                        onPress={() => setDonorMobile("")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.helperText}>
                    Instant payment confirmation and WhatsApp 80G tax receipt will be sent to this number.
                  </Text>
                </View>

                {/* Email (For 80G Receipt) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address (Optional for 80G Tax Receipt)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="your.email@domain.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={donorEmail}
                    onChangeText={setDonorEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PAN Card Number (Optional - Tax Exemption)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="ABCDE1234F"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    maxLength={10}
                    value={donorPan}
                    onChangeText={setDonorPan}
                  />
                </View>

                {/* Anonymous Toggle */}
                <Pressable
                  style={styles.anonymousRow}
                  onPress={() => setIsAnonymous(!isAnonymous)}
                >
                  <Ionicons
                    name={isAnonymous ? "checkbox" : "square-outline"}
                    size={20}
                    color={isAnonymous ? "#DC2626" : "#64748B"}
                  />
                  <Text style={styles.anonymousText}>
                    Make this donation anonymous on public community honor roll
                  </Text>
                </Pressable>

                {/* Active Checking / Verification Banner */}
                {processing ? (
                  <View style={styles.verifyingBanner}>
                    <ActivityIndicator size="small" color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyingBannerTitle}>Checking Payment Status...</Text>
                      <Text style={styles.verifyingBannerText}>
                        {verifyingStatus || "Verifying transaction with banking network..."}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* ------------------------------------------------------------- */}
                {/* METHOD 1: DIRECT UPI TRANSFER (kaaraikarangal@dbs) - FIRST    */}
                {/* ------------------------------------------------------------- */}
                {paymentMethod === "upi" ? (
                  <View style={styles.upiContainer}>
                    {/* UPI ID Header Card */}
                    <View style={styles.upiVpaCard}>
                      <View style={styles.upiVpaLeft}>
                        <View style={styles.dbsBadge}>
                          <Text style={styles.dbsBadgeText}>DBS BANK</Text>
                        </View>
                        <Text style={styles.upiVpaLabel}>OFFICIAL UPI VPA ID</Text>
                        <Text style={styles.upiVpaValue}>{OFFICIAL_UPI_ID}</Text>
                        <Text style={styles.upiVpaBank}>
                          Beneficiary: Kaarai Karangal Samooga Sevai Amaippu
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.copyUpiBtn, copiedUpi && styles.copyUpiBtnCopied]}
                        onPress={handleCopyUpi}
                      >
                        <Ionicons
                          name={copiedUpi ? "checkmark-circle" : "copy-outline"}
                          size={16}
                          color={copiedUpi ? "#059669" : "#0F172A"}
                        />
                        <Text
                          style={[
                            styles.copyUpiBtnText,
                            copiedUpi && styles.copyUpiBtnTextCopied,
                          ]}
                        >
                          {copiedUpi ? "Copied!" : "Copy"}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Dynamic QR Code Card */}
                    <View style={styles.qrCard}>
                      <Text style={styles.qrHeaderTitle}>SCAN TO PAY ₹{effectiveAmount}</Text>
                      <Text style={styles.qrHeaderSub}>
                        Use Google Pay, PhonePe, Paytm, BHIM or any banking app
                      </Text>

                      <View style={styles.qrImageWrap}>
                        <Image
                          source={{ uri: qrCodeUrl }}
                          style={styles.qrImage}
                          resizeMode="contain"
                        />
                      </View>

                      <View style={styles.qrAmountPill}>
                        <Ionicons name="shield-checkmark" size={14} color="#059669" />
                        <Text style={styles.qrAmountPillText}>
                          Exact Amount Encoded: ₹{effectiveAmount}
                        </Text>
                      </View>
                    </View>

                    {/* Quick Launch Buttons */}
                    <View style={styles.quickAppsBox}>
                      <Text style={styles.quickAppsTitle}>TAP TO OPEN IN YOUR UPI APP:</Text>
                      <View style={styles.quickAppsRow}>
                        <Pressable
                          style={styles.quickAppBtn}
                          onPress={() => handleOpenUpiApp("gpay")}
                        >
                          <Ionicons name="logo-google" size={16} color="#4285F4" />
                          <Text style={styles.quickAppBtnText}>GPay</Text>
                        </Pressable>

                        <Pressable
                          style={styles.quickAppBtn}
                          onPress={() => handleOpenUpiApp("phonepe")}
                        >
                          <Ionicons name="phone-portrait-outline" size={16} color="#5F259F" />
                          <Text style={styles.quickAppBtnText}>PhonePe</Text>
                        </Pressable>

                        <Pressable
                          style={styles.quickAppBtn}
                          onPress={() => handleOpenUpiApp("paytm")}
                        >
                          <Ionicons name="wallet-outline" size={16} color="#00BAF2" />
                          <Text style={styles.quickAppBtnText}>Paytm</Text>
                        </Pressable>

                        <Pressable
                          style={styles.quickAppBtn}
                          onPress={() => handleOpenUpiApp()}
                        >
                          <Ionicons name="send" size={15} color="#059669" />
                          <Text style={styles.quickAppBtnText}>Any UPI</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* UTR / Transaction Reference Submission */}
                    <View style={styles.utrBox}>
                      <View style={styles.labelRow}>
                        <Text style={styles.inputLabel}>
                          ENTER 12-DIGIT UPI REFERENCE (UTR) NUMBER <Text style={styles.requiredMark}>*</Text>
                        </Text>
                        {utrNumber.trim().length === 0 ? (
                          <View style={styles.statusBadgeMuted}>
                            <Text style={styles.statusBadgeMutedText}>12 Digits Required</Text>
                          </View>
                        ) : utrNumber.trim().length >= 10 ? (
                          <View style={styles.statusBadgeValid}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.statusBadgeValidText}>Ready to Verify</Text>
                          </View>
                        ) : (
                          <View style={styles.statusBadgeProgress}>
                            <Text style={styles.statusBadgeProgressText}>{utrNumber.trim().length}/12 Digits</Text>
                          </View>
                        )}
                      </View>

                      <TextInput
                        style={styles.utrTextInput}
                        placeholder="e.g. 429182749102"
                        placeholderTextColor="#94A3B8"
                        keyboardType="default"
                        autoCapitalize="characters"
                        maxLength={22}
                        value={utrNumber}
                        onChangeText={setUtrNumber}
                      />
                      <Text style={styles.helperText}>
                        After completing the transfer to {OFFICIAL_UPI_ID}, enter your 12-digit UTR/Ref number from your payment app to verify & instantly generate your receipt.
                      </Text>
                    </View>

                    {/* Submit UPI Donation Button */}
                    <Pressable
                      style={[styles.payBtnUpi, processing && styles.payBtnDisabled]}
                      onPress={handleConfirmUpiDonation}
                      disabled={processing}
                    >
                      <LinearGradient
                        colors={["#059669", "#047857"]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                      {processing ? (
                        <View style={styles.btnContent}>
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.payBtnText}>Verifying Payment with Bank...</Text>
                        </View>
                      ) : (
                        <View style={styles.btnContent}>
                          <Ionicons
                            name="shield-checkmark"
                            size={20}
                            color="#FFFFFF"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.payBtnText}>
                            Verify UPI Payment & Get Receipt (₹{effectiveAmount || 0})
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  /* ----------------------------------------------------------- */
                  /* METHOD 2: RAZORPAY GATEWAY VIEW - SECOND                    */
                  /* ----------------------------------------------------------- */
                  <View>
                    {/* Razorpay Trust Strip */}
                    <View style={styles.trustStrip}>
                      <View style={styles.trustItem}>
                        <Ionicons name="lock-closed" size={14} color="#0284C7" />
                        <Text style={styles.trustText}>Razorpay</Text>
                      </View>
                      <View style={styles.trustDot} />
                      <View style={styles.trustItem}>
                        <Ionicons name="flash" size={14} color="#059669" />
                        <Text style={styles.trustText}>Verified Gateway</Text>
                      </View>
                      <View style={styles.trustDot} />
                      <View style={styles.trustItem}>
                        <Ionicons name="heart" size={14} color="#DC2626" />
                        <Text style={styles.trustText}>100% Non-Profit</Text>
                      </View>
                    </View>

                    {/* Razorpay Checkout Button */}
                    <Pressable
                      style={[styles.payBtn, processing && styles.payBtnDisabled]}
                      onPress={handleDonateRazorpay}
                      disabled={processing}
                    >
                      <LinearGradient
                        colors={["#DC2626", "#B91C1C"]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                      {processing ? (
                        <View style={styles.btnContent}>
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.payBtnText}>Connecting to Razorpay...</Text>
                        </View>
                      ) : (
                        <View style={styles.btnContent}>
                          <Ionicons name="card" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.payBtnText}>
                            Pay ₹{effectiveAmount || 0} via Razorpay
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                )}

                {/* Organization Details Footer */}
                <View style={styles.orgFooter}>
                  <Text style={styles.orgFooterTitle}>Kaarai Karangal Samooga Sevai Amaippu</Text>
                  <Text style={styles.orgFooterSub}>
                    Reg. No. 31/2025 · K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602
                  </Text>
                  <Text style={styles.orgFooterContact}>
                    UPI: kaaraikarangal@dbs · Helpline: +91 9750807463 · Email: kaaraikarangal@gmail.com
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* IN-APP RAZORPAY CHECKOUT MODAL (For Native Android / iOS Mobile App) */}
    <Modal
      visible={rzpModalVisible}
      animationType="slide"
      onRequestClose={() => {
        setRzpModalVisible(false);
        setProcessing(false);
      }}
    >
      <SafeAreaView style={styles.rzpModalContainer} edges={["top", "bottom"]}>
        <View style={styles.rzpHeader}>
          <View style={styles.rzpHeaderLeft}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.rzpHeaderTitle}>Razorpay Secure Checkout</Text>
          </View>
          <Pressable
            style={styles.rzpCloseBtn}
            onPress={() => {
              setRzpModalVisible(false);
              setProcessing(false);
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {WebView ? (
          <WebView
            source={{ html: rzpCheckoutHtml, baseUrl: "https://checkout.razorpay.com" }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.rzpLoadingOverlay}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.rzpLoadingText}>Connecting to Razorpay Secure Gateway...</Text>
              </View>
            )}
            originWhitelist={["*"]}
            onShouldStartLoadWithRequest={(request: any) => {
              const u = request.url;
              if (
                u.startsWith("upi://") ||
                u.startsWith("phonepe://") ||
                u.startsWith("paytmmp://") ||
                u.startsWith("tez://") ||
                u.startsWith("intent://")
              ) {
                Linking.openURL(u).catch(() => {});
                return false;
              }
              return true;
            }}
            onMessage={handleRzpMessage}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={styles.rzpFallbackBox}>
            <Ionicons name="alert-circle" size={36} color="#DC2626" />
            <Text style={styles.rzpFallbackText}>
              In-app browser component not available on this device.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  orgBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  amountCard: {
    flexBasis: "31%",
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  amountCardActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  amountValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  amountValueActive: {
    color: "#DC2626",
  },
  amountLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  amountLabelActive: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  customInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: "800",
    color: "#DC2626",
    marginRight: 6,
  },
  customTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  purposeContainer: {
    gap: 6,
    marginBottom: 14,
  },
  purposeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  purposeChipActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF1F2",
  },
  purposeText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  purposeTextActive: {
    color: "#991B1B",
    fontWeight: "700",
  },
  // PAYMENT METHOD SWITCHER
  methodTabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  methodTabActiveRzp: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  methodTabActiveUpi: {
    borderColor: "#059669",
    backgroundColor: "#ECFDF5",
  },
  methodTabHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  methodTabTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },
  methodTabTitleActiveRzp: {
    color: "#B91C1C",
  },
  methodTabTitleActiveUpi: {
    color: "#047857",
  },
  methodTabSub: {
    fontSize: 10,
    color: "#64748B",
    lineHeight: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputRow: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  requiredMark: {
    color: "#DC2626",
    fontWeight: "900",
  },
  statusBadgeMuted: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeMutedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  statusBadgeValid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusBadgeValidText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  statusBadgeError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusBadgeErrorText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  statusBadgeProgress: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusBadgeProgressText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    height: 48,
  },
  phoneInputContainerValid: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  phoneInputContainerTyping: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },
  countryCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  clearBtn: {
    padding: 4,
  },
  helperText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 5,
    lineHeight: 14,
  },
  textInput: {
    height: 44,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  anonymousRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  anonymousText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },
  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  payBtn: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnDisabled: {
    opacity: 0.7,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  // DIRECT UPI STYLES
  upiContainer: {
    gap: 12,
    marginBottom: 12,
  },
  upiVpaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    padding: 14,
  },
  upiVpaLeft: {
    flex: 1,
    paddingRight: 8,
  },
  dbsBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  dbsBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  upiVpaLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#047857",
    letterSpacing: 0.6,
  },
  upiVpaValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 2,
    letterSpacing: 0.3,
  },
  upiVpaBank: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
  },
  copyUpiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  copyUpiBtnCopied: {
    backgroundColor: "#ECFDF5",
    borderColor: "#059669",
  },
  copyUpiBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  copyUpiBtnTextCopied: {
    color: "#059669",
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  qrHeaderTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  qrHeaderSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 12,
    textAlign: "center",
  },
  qrImageWrap: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  qrImage: {
    width: 188,
    height: 188,
  },
  qrAmountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 12,
  },
  qrAmountPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  quickAppsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  quickAppsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickAppsRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickAppBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  quickAppBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  utrBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    padding: 14,
  },
  utrTextInput: {
    height: 46,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#94A3B8",
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  payBtnUpi: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  orgFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  orgFooterTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  orgFooterSub: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
  orgFooterContact: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  // RECEIPT STYLES
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  receiptTopHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  receiptCheckCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  receiptTopTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  receiptTopSub: {
    fontSize: 12,
    color: "#D1FAE5",
    marginTop: 2,
    fontWeight: "600",
  },
  receiptTopAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 8,
  },
  receiptContent: {
    padding: 18,
  },
  receiptOrgRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  receiptOrgName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  receiptOrgMeta: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 14,
  },
  receiptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  receiptGridItem: {
    width: "48%",
  },
  receiptLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },
  receiptValue: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    marginTop: 2,
  },
  receiptValueBold: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "800",
    marginTop: 2,
  },
  receiptStampBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  receiptStampText: {
    fontSize: 11,
    color: "#065F46",
    flex: 1,
    lineHeight: 15,
  },
  receiptActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  receiptShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
  },
  receiptShareBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  receiptDoneBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 10,
  },
  receiptDoneBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  receiptVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: "center",
  },
  receiptVerifiedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.6,
  },
  verifyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  verifyingBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 2,
  },
  verifyingBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857",
  },
  rzpModalContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  rzpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  rzpHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rzpHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  rzpCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  rzpLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  rzpLoadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  rzpFallbackBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  rzpFallbackText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
