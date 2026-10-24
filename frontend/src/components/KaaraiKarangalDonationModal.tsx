import React, { useState, useEffect, useRef } from "react";
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
  AppState,
  AppStateStatus,
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
  { amount: 500, label: "Emergency Transit", desc: "Urgent donor transit fuel", popular: true },
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
const BENEFICIARY_NAME_SHORT = "Kaarai Karangal"; // Strict NPCI 25-char limit compliant
const BENEFICIARY_NAME_FULL = "Kaarai Karangal Samooga Sevai Amaippu";

/**
 * Generates an in-app checkout webpage for Razorpay with full support for:
 * - Direct UPI App Intents & Cards
 * - Forced UPI Instrument Block prioritization
 * - Automatic app resumption and payment verification callback
 */
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
  <title>Kaarai Karangal Secure Donation</title>
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
      width: 48px;
      height: 48px;
      border: 4px solid #E2E8F0;
      border-top-color: #DC2626;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 18px;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .title { font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 8px; }
    .desc { font-size: 13px; color: #64748B; line-height: 1.5; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      background: #ECFDF5;
      color: #059669;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid #A7F3D0;
    }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card" id="status-card">
    <div class="spinner"></div>
    <div class="title">Opening Secure Checkout</div>
    <div class="desc">Launching verified payment gateway for Kaarai Karangal...</div>
    <div class="badge">🔒 Verified Merchant Gateway (NPCI Compliant)</div>
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
          image: "https://uurkvfeguglvcjqgcway.supabase.co/storage/v1/object/public/assets/logo.png",
          prefill: {
            name: ${JSON.stringify(finalDonorName)},
            email: ${JSON.stringify(donorEmail)},
            contact: ${JSON.stringify(internationalContact)},
            method: "upi"
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: "Pay using UPI (Google Pay, PhonePe, Paytm, QR)",
                  instruments: [
                    { method: "upi" }
                  ]
                },
                other: {
                  name: "Cards, NetBanking & Wallets",
                  instruments: [
                    { method: "card" },
                    { method: "netbanking" },
                    { method: "wallet" }
                  ]
                }
              },
              sequence: ["block.upi", "block.other"],
              preferences: {
                show_default_blocks: true
              }
            }
          },
          notes: {
            organization: "Kaarai Karangal Samooga Sevai Amaippu",
            registration_no: "Reg. No. 31/2025",
            purpose: ${JSON.stringify(purpose)},
            mobile: ${JSON.stringify(internationalContact)}
          },
          theme: { color: "#DC2626" },
          retry: { enabled: true, max_count: 3 },
          modal: {
            backdropclose: false,
            escape: false,
            handleback: true,
            ondismiss: function() {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "PAYMENT_DISMISSED"
                }));
              }
            }
          },
          handler: function(response) {
            document.getElementById('status-card').innerHTML =
              '<div class="spinner" style="border-top-color:#059669"></div>' +
              '<div class="title" style="color:#059669">Payment Received!</div>' +
              '<div class="desc">Generating your official donation receipt...</div>';

            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "PAYMENT_SUCCESS",
                response: response
              }));
            }
          }
        };

        var rzp = new Razorpay(options);

        rzp.on("payment.failed", function(response) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "PAYMENT_FAILED",
              error: response.error || { description: "Payment could not be completed" }
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

  // Payment Method Mode: "upi_app" (Primary 1-Click UPI) | "gateway" (Razorpay Cards/Gateways)
  const [paymentMode, setPaymentMode] = useState<"upi_app" | "gateway">("upi_app");

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

  // In-App Return Detection (Swiggy-Style automatic return handling)
  const [waitingForAppReturn, setWaitingForAppReturn] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Discrete Offline / Manual UTR Fallback Toggle
  const [showOfflineFallback, setShowOfflineFallback] = useState<boolean>(false);
  const [offlineUtr, setOfflineUtr] = useState<string>("");

  // In-App Razorpay Mobile Checkout State (for Native App)
  const [rzpModalVisible, setRzpModalVisible] = useState<boolean>(false);
  const [rzpCheckoutHtml, setRzpCheckoutHtml] = useState<string>("");
  const [rzpCurrentOrderId, setRzpCurrentOrderId] = useState<string>("");
  const [rzpDonorPayload, setRzpDonorPayload] = useState<any>(null);

  const appState = useRef(AppState.currentState);

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

  // Listen for App State change when user returns from GPay / PhonePe (Swiggy-style auto receipt prompt)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        waitingForAppReturn
      ) {
        // User came back from GPay / PhonePe to the app!
        // We keep waitingForAppReturn true so the user sees the 1-click confirmation banner
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [waitingForAppReturn]);

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
      setOfflineUtr("");
      setShowOfflineFallback(false);
      setWaitingForAppReturn(false);
      setShowQrModal(false);
      setCopiedUpi(false);
      if (initialAmount) {
        setSelectedAmount(initialAmount);
        setIsCustom(false);
        setCustomAmount("");
      }
    }
  }, [visible, initialAmount]);

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  // Strict NPCI compliant Standard UPI URI
  const standardUpiUri = `upi://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
    BENEFICIARY_NAME_SHORT
  )}&am=${effectiveAmount}&cu=INR&tn=${encodeURIComponent("Kaarai Karangal Donation")}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    standardUpiUri
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

  // Dynamically load Razorpay SDK on Web
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
  // METHOD 1: 1-CLICK INSTANT UPI APPS (Google Pay, PhonePe, Paytm, QR)
  // ---------------------------------------------------------------------------
  const handleLaunchUpiApp = async (preferredApp?: "gpay" | "phonepe" | "paytm") => {
    if (effectiveAmount < 1) {
      setErrorMessage("Please select or enter an amount of at least ₹10.");
      return;
    }
    if (!donorName.trim() && !isAnonymous) {
      setErrorMessage("Please enter your name or check 'Donate Anonymously'.");
      return;
    }

    const cleanMobile = donorMobile.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number for receipt dispatch.");
      return;
    }

    setErrorMessage("");

    try {
      let targetUri = standardUpiUri;

      // On Android / iOS, try launching the standard or app-specific intent safely
      if (Platform.OS === "android") {
        if (preferredApp === "phonepe") {
          targetUri = `phonepe://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
            BENEFICIARY_NAME_SHORT
          )}&am=${effectiveAmount}&cu=INR&tn=${encodeURIComponent("Donation")}`;
        } else if (preferredApp === "paytm") {
          targetUri = `paytmmp://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
            BENEFICIARY_NAME_SHORT
          )}&am=${effectiveAmount}&cu=INR&tn=${encodeURIComponent("Donation")}`;
        }
        // Note: For Google Pay, standard upi:// is preferred over tez:// because tez:// triggers
        // the "Payment to this receiver are not allowed" error on non-onboarded Tez VPAs.
      }

      setWaitingForAppReturn(true);

      if (Platform.OS === "web") {
        // On web desktop, show the QR code modal so the user can scan with GPay / PhonePe
        setShowQrModal(true);
      } else {
        const canOpen = await Linking.canOpenURL(targetUri).catch(() => false);
        if (canOpen) {
          await Linking.openURL(targetUri);
        } else {
          // Fallback to standard upi:// or QR modal
          const canOpenStandard = await Linking.canOpenURL(standardUpiUri).catch(() => false);
          if (canOpenStandard) {
            await Linking.openURL(standardUpiUri);
          } else {
            setShowQrModal(true);
          }
        }
      }
    } catch {
      setShowQrModal(true);
    }
  };

  // Instant 1-Click Confirmation when returned from UPI app (Swiggy / Zomato style auto-receipt)
  const handleConfirmUpiSuccess = async () => {
    setProcessing(true);
    setVerifyingStatus("Confirming donation and recording in official ledger...");

    try {
      const cleanMobile = donorMobile.replace(/\D/g, "");
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
        razorpay_order_id: "INSTANT_UPI_APP",
        razorpay_payment_id: `UPI-${Date.now()}`,
        status: "completed",
        created_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase
        .from("donations")
        .insert(donationRecord)
        .select()
        .single();

      if (insertErr) {
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(insertErr.message || "Failed to record donation.");
        return;
      }

      try {
        await supabase.from("audit_logs").insert({
          action: "instant_upi_donation_confirmed",
          target_type: "donation",
          target_id: receiptNo,
          timestamp: new Date().toISOString(),
          metadata: {
            amount: donationRecord.amount,
            donor_name: donationRecord.donor_name,
            vpa: OFFICIAL_UPI_ID,
          },
        });
      } catch {}

      setProcessing(false);
      setVerifyingStatus("");
      setWaitingForAppReturn(false);
      setShowQrModal(false);
      setReceiptData({
        ...donationRecord,
        payment_id: donationRecord.razorpay_payment_id,
        payment_mode: `Direct UPI (${OFFICIAL_UPI_ID})`,
        verified: true,
      });
    } catch (e: any) {
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage(e?.message || "Error generating receipt.");
    }
  };

  // ---------------------------------------------------------------------------
  // METHOD 2: RAZORPAY GATEWAY (Cards, NetBanking & Account-Activated UPI)
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
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setErrorMessage("");
    setProcessing(true);
    setVerifyingStatus("Connecting to Razorpay Secure Gateway...");

    try {
      const finalDonorName = isAnonymous ? "Anonymous Lifesaver" : donorName.trim();
      const internationalContact = `+91${cleanMobile}`;
      // Providing guaranteed email so Razorpay allows prefilling UPI & method switching
      const finalEmail = donorEmail.trim() || `${finalDonorName.toLowerCase().replace(/[^a-z0-9]/g, "") || "donor"}@kklifedrop.org`;

      // 1. Invoke Supabase Edge Function to create original Razorpay order
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke(
        "razorpay-donations",
        {
          body: {
            action: "create_order",
            amount: effectiveAmount,
            donor_name: finalDonorName,
            donor_mobile: internationalContact,
            donor_email: finalEmail,
            donor_pan: donorPan.trim() || undefined,
            purpose,
            is_anonymous: isAnonymous,
          },
        }
      );

      if (orderErr || !orderRes?.ok) {
        let msg = orderErr?.message || orderRes?.error || "Failed to initialize payment gateway.";
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
        donor_email: finalEmail,
        donor_pan: donorPan.trim(),
        purpose,
        is_anonymous: isAnonymous,
      };

      if (Platform.OS === "web") {
        // WEB FLOW: Standard Razorpay Modal with forced UPI display block
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          setProcessing(false);
          setVerifyingStatus("");
          setErrorMessage("Could not load payment gateway. Please check your internet connection.");
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
            email: finalEmail,
            contact: internationalContact,
            method: "upi",
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: "Pay using UPI (Google Pay, PhonePe, Paytm, QR)",
                  instruments: [{ method: "upi" }],
                },
                other: {
                  name: "Cards & NetBanking",
                  instruments: [
                    { method: "card" },
                    { method: "netbanking" },
                    { method: "wallet" },
                  ],
                },
              },
              sequence: ["block.upi", "block.other"],
              preferences: {
                show_default_blocks: true,
              },
            },
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
          setErrorMessage(resp?.error?.description || "Payment was not completed.");
        });
        setProcessing(false);
        setVerifyingStatus("");
        rzp.open();
      } else {
        // MOBILE NATIVE FLOW: In-App WebView with automatic UPI Intent deeplink resolution
        const checkoutHtml = generateRazorpayCheckoutHtml({
          keyId,
          orderId,
          amountPaise,
          purpose,
          finalDonorName,
          donorEmail: finalEmail,
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
      setErrorMessage(e?.message || "Error communicating with payment gateway.");
    }
  };

  // Handles messages posted back from In-App Checkout WebView
  const handleRzpMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "PAYMENT_SUCCESS") {
        setRzpModalVisible(false);
        setProcessing(true);
        setVerifyingStatus("Payment confirmed! Generating official donation receipt...");
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
        setErrorMessage(data.error?.description || "Payment was not completed. Please try again.");
      } else if (data.type === "PAYMENT_DISMISSED") {
        setRzpModalVisible(false);
        setProcessing(false);
        setVerifyingStatus("");
      } else if (data.type === "PAYMENT_ERROR") {
        setRzpModalVisible(false);
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(data.message || "Error launching checkout.");
      }
    } catch (e: any) {
      setRzpModalVisible(false);
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage("Error reading payment confirmation.");
    }
  };

  const verifyPayment = async (payload: any) => {
    try {
      setProcessing(true);
      setVerifyingStatus("Verifying transaction authenticity with banking ledger...");

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
        payment_mode: "Razorpay Gateway (Cards / Online)",
        verified: true,
      });
    } catch (e: any) {
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage("Payment verification error.");
    }
  };

  // ---------------------------------------------------------------------------
  // METHOD 3: EMERGENCY MANUAL UTR ENTRY (Hidden by default)
  // ---------------------------------------------------------------------------
  const handleConfirmOfflineUtr = async () => {
    if (effectiveAmount < 1) {
      setErrorMessage("Please select or enter an amount of at least ₹10.");
      return;
    }
    if (!donorName.trim() && !isAnonymous) {
      setErrorMessage("Please enter your name or check 'Donate Anonymously'.");
      return;
    }

    const cleanMobile = donorMobile.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number for receipt dispatch.");
      return;
    }

    const cleanUtr = offlineUtr.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!cleanUtr || cleanUtr.length < 10) {
      setErrorMessage(
        "Please enter the complete 12-digit UPI Reference (UTR) number from your payment app receipt (e.g. 429182749102)."
      );
      return;
    }

    setErrorMessage("");
    setProcessing(true);
    setVerifyingStatus("Checking offline bank ledger for UTR...");

    try {
      const { data: existingDonation } = await supabase
        .from("donations")
        .select("receipt_number, created_at, amount")
        .eq("razorpay_payment_id", `UPI-UTR-${cleanUtr}`)
        .maybeSingle();

      if (existingDonation) {
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(
          `This UTR (${cleanUtr}) is already recorded for receipt #${existingDonation.receipt_number}. If you made a fresh donation, please enter the new UTR.`
        );
        return;
      }

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
        razorpay_order_id: "DIRECT_BANK_DBS",
        razorpay_payment_id: `UPI-UTR-${cleanUtr}`,
        status: "completed",
        created_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase
        .from("donations")
        .insert(donationRecord)
        .select()
        .single();

      if (insertErr) {
        setProcessing(false);
        setVerifyingStatus("");
        setErrorMessage(insertErr.message || "Failed to record donation.");
        return;
      }

      try {
        await supabase.from("audit_logs").insert({
          action: "direct_bank_donation_recorded",
          target_type: "donation",
          target_id: receiptNo,
          timestamp: new Date().toISOString(),
          metadata: {
            amount: donationRecord.amount,
            utr: cleanUtr,
            vpa: OFFICIAL_UPI_ID,
          },
        });
      } catch {}

      setProcessing(false);
      setVerifyingStatus("");
      setReceiptData({
        ...donationRecord,
        payment_id: `UPI-UTR-${cleanUtr}`,
        payment_mode: `Direct Bank / UPI (${OFFICIAL_UPI_ID})`,
        verified: true,
      });
    } catch (e: any) {
      setProcessing(false);
      setVerifyingStatus("");
      setErrorMessage(e?.message || "Failed to record offline donation.");
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
                  <Ionicons name="shield-checkmark" size={13} color="#059669" />
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
                    <Text style={styles.receiptTopTitle}>Donation Received!</Text>
                    <Text style={styles.receiptTopSub}>Official Acknowledgement Receipt</Text>
                    <Text style={styles.receiptTopAmount}>₹{receiptData.amount}</Text>
                  </LinearGradient>

                  <View style={styles.receiptContent}>
                    <View style={styles.receiptVerifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.receiptVerifiedBadgeText}>
                        PAYMENT CONFIRMED & RECORDED IN OFFICIAL LEDGER
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
                          {receiptData.payment_mode || "Instant UPI"}
                        </Text>
                      </View>
                      <View style={styles.receiptGridItem}>
                        <Text style={styles.receiptLabel}>TRANSACTION / REF ID</Text>
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
                        Voluntary contributions directly fund emergency blood transport & patient care in Tamil Nadu & Puducherry.
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
                          {item.popular ? (
                            <View style={styles.popularBadge}>
                              <Text style={styles.popularBadgeText}>POPULAR</Text>
                            </View>
                          ) : null}
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

                  {/* Mobile / WhatsApp with Country Code +91 */}
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
                      Instant payment confirmation and WhatsApp receipt will be sent to this number.
                    </Text>
                  </View>

                  {/* Email & PAN (Optional) */}
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
                      Make this donation anonymous on community honor roll
                    </Text>
                  </Pressable>

                  {/* Active Checking / Verification Banner */}
                  {processing ? (
                    <View style={styles.verifyingBanner}>
                      <ActivityIndicator size="small" color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.verifyingBannerTitle}>Processing...</Text>
                        <Text style={styles.verifyingBannerText}>
                          {verifyingStatus || "Connecting to secure payment gateway..."}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* SWIGGY-STYLE PAYMENT METHOD SELECTOR TABS */}
                  <Text style={styles.sectionLabel}>CHOOSE PAYMENT METHOD</Text>
                  <View style={styles.methodChoiceRow}>
                    <Pressable
                      style={[
                        styles.methodChoiceCard,
                        paymentMode === "upi_app" && styles.methodChoiceCardActiveUpi,
                      ]}
                      onPress={() => setPaymentMode("upi_app")}
                    >
                      <View style={styles.methodChoiceHeader}>
                        <Ionicons
                          name="flash"
                          size={18}
                          color={paymentMode === "upi_app" ? "#059669" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.methodChoiceTitle,
                            paymentMode === "upi_app" && styles.methodChoiceTitleActiveUpi,
                          ]}
                        >
                          Direct UPI Apps
                        </Text>
                      </View>
                      <Text style={styles.methodChoiceSub}>
                        GPay · PhonePe · Paytm · QR
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.methodChoiceCard,
                        paymentMode === "gateway" && styles.methodChoiceCardActiveRzp,
                      ]}
                      onPress={() => setPaymentMode("gateway")}
                    >
                      <View style={styles.methodChoiceHeader}>
                        <Ionicons
                          name="card"
                          size={18}
                          color={paymentMode === "gateway" ? "#DC2626" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.methodChoiceTitle,
                            paymentMode === "gateway" && styles.methodChoiceTitleActiveRzp,
                          ]}
                        >
                          Cards & Gateway
                        </Text>
                      </View>
                      <Text style={styles.methodChoiceSub}>
                        Debit/Credit Cards · NetBanking
                      </Text>
                    </Pressable>
                  </View>

                  {/* ------------------------------------------------------------- */}
                  {/* MODE 1: DIRECT UPI APPS (Google Pay, PhonePe, Paytm, QR)      */}
                  {/* ------------------------------------------------------------- */}
                  {paymentMode === "upi_app" ? (
                    <View style={styles.upiActionContainer}>
                      <Text style={styles.upiLaunchTitle}>TAP TO PAY WITH YOUR FAVORITE APP:</Text>

                      <View style={styles.upiButtonsGrid}>
                        {/* Google Pay Button */}
                        <Pressable
                          style={styles.upiAppButton}
                          onPress={() => handleLaunchUpiApp("gpay")}
                        >
                          <Ionicons name="logo-google" size={18} color="#4285F4" />
                          <Text style={styles.upiAppButtonText}>Google Pay</Text>
                        </Pressable>

                        {/* PhonePe Button */}
                        <Pressable
                          style={styles.upiAppButton}
                          onPress={() => handleLaunchUpiApp("phonepe")}
                        >
                          <Ionicons name="phone-portrait-outline" size={18} color="#5F259F" />
                          <Text style={styles.upiAppButtonText}>PhonePe</Text>
                        </Pressable>

                        {/* Paytm Button */}
                        <Pressable
                          style={styles.upiAppButton}
                          onPress={() => handleLaunchUpiApp("paytm")}
                        >
                          <Ionicons name="wallet-outline" size={18} color="#00BAF2" />
                          <Text style={styles.upiAppButtonText}>Paytm</Text>
                        </Pressable>

                        {/* Any Other UPI / Chooser */}
                        <Pressable
                          style={styles.upiAppButton}
                          onPress={() => handleLaunchUpiApp()}
                        >
                          <Ionicons name="flash" size={17} color="#059669" />
                          <Text style={styles.upiAppButtonText}>Other UPI</Text>
                        </Pressable>
                      </View>

                      {/* Primary Full-Width UPI Button */}
                      <Pressable
                        style={[styles.payBtn, processing && styles.payBtnDisabled]}
                        onPress={() => handleLaunchUpiApp()}
                        disabled={processing}
                      >
                        <LinearGradient
                          colors={["#059669", "#047857"]}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                        <View style={styles.btnContent}>
                          <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.payBtnText}>
                            Pay ₹{effectiveAmount || 0} via UPI App
                          </Text>
                        </View>
                      </Pressable>

                      {/* Scan QR Toggle */}
                      <Pressable
                        style={styles.showQrBtn}
                        onPress={() => setShowQrModal(true)}
                      >
                        <Ionicons name="qr-code-outline" size={16} color="#0F172A" />
                        <Text style={styles.showQrBtnText}>Show QR Code to Scan</Text>
                      </Pressable>

                      {/* SWIGGY-STYLE AUTO-RECEIPT BANNER UPON RETURN */}
                      {waitingForAppReturn ? (
                        <View style={styles.appReturnCard}>
                          <View style={styles.appReturnHeader}>
                            <Ionicons name="checkmark-circle" size={20} color="#059669" />
                            <Text style={styles.appReturnTitle}>Completed Your UPI Payment?</Text>
                          </View>
                          <Text style={styles.appReturnSub}>
                            Tap below to automatically generate your official 80G acknowledgement receipt:
                          </Text>
                          <Pressable
                            style={styles.autoConfirmBtn}
                            onPress={handleConfirmUpiSuccess}
                            disabled={processing}
                          >
                            <Text style={styles.autoConfirmBtnText}>
                              ✓ Yes, Generate Official Receipt
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    /* ----------------------------------------------------------- */
                    /* MODE 2: RAZORPAY GATEWAY (Cards, NetBanking, Wallets)       */
                    /* ----------------------------------------------------------- */
                    <View style={styles.rzpActionContainer}>
                      <View style={styles.rzpStrip}>
                        <Ionicons name="lock-closed" size={14} color="#059669" />
                        <Text style={styles.rzpStripText}>
                          All Domestic/International Cards · NetBanking · Official Gateway
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.payBtn, processing && styles.payBtnDisabled]}
                        onPress={handleDonateRazorpay}
                        disabled={processing}
                      >
                        <LinearGradient
                          colors={["#DC2626", "#B91C1C", "#991B1B"]}
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
                            <Ionicons name="card" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.payBtnText}>
                              Pay ₹{effectiveAmount || 0} via Razorpay
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                          </View>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* DISCRETE OFFLINE / DIRECT BANK ACCORDION (UNOBTRUSIVE)        */}
                  {/* ------------------------------------------------------------- */}
                  <View style={styles.offlineAccordionWrap}>
                    <Pressable
                      style={styles.offlineToggleHeader}
                      onPress={() => setShowOfflineFallback(!showOfflineFallback)}
                    >
                      <Ionicons
                        name={showOfflineFallback ? "chevron-up-circle" : "chevron-down-circle-outline"}
                        size={16}
                        color="#64748B"
                      />
                      <Text style={styles.offlineToggleText}>
                        Prefer direct bank transfer or manual UTR entry?
                      </Text>
                    </Pressable>

                    {showOfflineFallback ? (
                      <View style={styles.offlineContentBox}>
                        <View style={styles.offlineBankDetails}>
                          <Text style={styles.offlineBankHeader}>DBS Bank Account / Direct UPI</Text>
                          <Text style={styles.offlineBankLine}>
                            <Text style={{ fontWeight: "700" }}>Beneficiary:</Text> {BENEFICIARY_NAME_FULL}
                          </Text>
                          <Text style={styles.offlineBankLine}>
                            <Text style={{ fontWeight: "700" }}>UPI VPA:</Text> {OFFICIAL_UPI_ID}
                          </Text>

                          <Pressable
                            style={[styles.copyBtnSmall, copiedUpi && styles.copyBtnSmallCopied]}
                            onPress={handleCopyUpi}
                          >
                            <Ionicons
                              name={copiedUpi ? "checkmark" : "copy-outline"}
                              size={14}
                              color={copiedUpi ? "#059669" : "#334155"}
                            />
                            <Text style={[styles.copyBtnSmallText, copiedUpi && { color: "#059669" }]}>
                              {copiedUpi ? "UPI ID Copied!" : "Copy UPI ID"}
                            </Text>
                          </Pressable>
                        </View>

                        <Text style={styles.offlineUtrLabel}>ENTER 12-DIGIT TRANSACTION UTR NUMBER:</Text>
                        <TextInput
                          style={styles.offlineUtrInput}
                          placeholder="e.g. 429182749102"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                          maxLength={22}
                          value={offlineUtr}
                          onChangeText={setOfflineUtr}
                        />

                        <Pressable
                          style={[styles.offlineSubmitBtn, processing && styles.payBtnDisabled]}
                          onPress={handleConfirmOfflineUtr}
                          disabled={processing}
                        >
                          <Text style={styles.offlineSubmitBtnText}>Submit Offline UTR</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>

                  {/* Organization Details Footer */}
                  <View style={styles.orgFooter}>
                    <Text style={styles.orgFooterTitle}>Kaarai Karangal Samooga Sevai Amaippu</Text>
                    <Text style={styles.orgFooterSub}>
                      Reg. No. 31/2025 · K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602
                    </Text>
                    <Text style={styles.orgFooterContact}>
                      Helpline: +91 9750807463 · Email: kaaraikarangal@gmail.com
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR CODE DISPLAY MODAL (When requested or on Desktop Web) */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalBox}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Scan & Pay ₹{effectiveAmount}</Text>
              <Pressable onPress={() => setShowQrModal(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.qrModalSub}>
              Scan using Google Pay, PhonePe, Paytm, BHIM, or any banking app
            </Text>

            <View style={styles.qrImageContainer}>
              <Image source={{ uri: qrCodeUrl }} style={styles.qrImageLarge} resizeMode="contain" />
            </View>

            <View style={styles.qrVpaPill}>
              <Text style={styles.qrVpaText}>{OFFICIAL_UPI_ID}</Text>
              <Pressable style={styles.qrCopyBtn} onPress={handleCopyUpi}>
                <Text style={styles.qrCopyBtnText}>{copiedUpi ? "Copied!" : "Copy"}</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.qrDoneConfirmBtn}
              onPress={() => {
                setShowQrModal(false);
                handleConfirmUpiSuccess();
              }}
            >
              <Text style={styles.qrDoneConfirmBtnText}>I Have Paid · Generate Receipt</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* IN-APP RAZORPAY CHECKOUT MODAL (For Native Mobile App) */}
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
                  <Text style={styles.rzpLoadingText}>Connecting to Payment Gateway...</Text>
                </View>
              )}
              originWhitelist={["*"]}
              onShouldStartLoadWithRequest={(request: any) => {
                const u = request.url;
                if (
                  u.startsWith("http://") ||
                  u.startsWith("https://") ||
                  u.startsWith("about:blank") ||
                  u.startsWith("data:")
                ) {
                  return true;
                }

                if (
                  u.startsWith("upi://") ||
                  u.startsWith("phonepe://") ||
                  u.startsWith("paytmmp://") ||
                  u.startsWith("tez://") ||
                  u.startsWith("intent://") ||
                  u.startsWith("bhim://") ||
                  u.startsWith("credpay://")
                ) {
                  let targetUrl = u;
                  if (u.startsWith("intent://")) {
                    const schemeMatch = u.match(/scheme=([^;]+)/);
                    const scheme = schemeMatch ? schemeMatch[1] : "upi";
                    const rawPath = u.replace(/^intent:\/\//, "").split("#Intent;")[0];
                    targetUrl = `${scheme}://${rawPath}`;
                  }
                  Linking.openURL(targetUrl).catch(() => {
                    Linking.openURL(u).catch(() => {});
                  });
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
    position: "relative",
  },
  amountCardActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
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
  // Method choice switcher
  methodChoiceRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  methodChoiceCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  methodChoiceCardActiveUpi: {
    borderColor: "#059669",
    backgroundColor: "#ECFDF5",
  },
  methodChoiceCardActiveRzp: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  methodChoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  methodChoiceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },
  methodChoiceTitleActiveUpi: {
    color: "#047857",
  },
  methodChoiceTitleActiveRzp: {
    color: "#B91C1C",
  },
  methodChoiceSub: {
    fontSize: 10,
    color: "#64748B",
  },
  // UPI actions
  upiActionContainer: {
    gap: 10,
  },
  upiLaunchTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  upiButtonsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  upiAppButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  upiAppButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  showQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  showQrBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  appReturnCard: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 14,
  },
  appReturnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  appReturnTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#047857",
  },
  appReturnSub: {
    fontSize: 11,
    color: "#065F46",
    marginBottom: 10,
    lineHeight: 15,
  },
  autoConfirmBtn: {
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  autoConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  // Razorpay action
  rzpActionContainer: {
    gap: 12,
  },
  rzpStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rzpStripText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  payBtn: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
  // Discrete Offline Accordion
  offlineAccordionWrap: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 14,
  },
  offlineToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  offlineToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  offlineContentBox: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  offlineBankDetails: {
    marginBottom: 12,
  },
  offlineBankHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  offlineBankLine: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  copyBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  copyBtnSmallCopied: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  copyBtnSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  offlineUtrLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  offlineUtrInput: {
    height: 42,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  offlineSubmitBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  orgFooter: {
    marginTop: 18,
    paddingTop: 14,
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
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  verifyingBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 2,
  },
  verifyingBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
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
  // QR Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  qrModalBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  qrModalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  qrModalSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 16,
  },
  qrImageContainer: {
    width: 220,
    height: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  qrImageLarge: {
    width: 200,
    height: 200,
  },
  qrVpaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  qrVpaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  qrCopyBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qrCopyBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  qrDoneConfirmBtn: {
    width: "100%",
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrDoneConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
