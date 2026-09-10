// Starter offers: edit these and their terms before announcing the campaign.
// Changing campaignId starts a new browser-local campaign.
export const rewardsConfig = {
  campaignId: "clarea-welcome-v1",
  durationSeconds: 5,
  terms: {
    ar: "هدية واحدة لكل متصفح خلال العرض. نتيجة «حاولي مرة أخرى» تمنحك دورة إضافية دون رقم مرجعي. يُرجى تأكيد الهدية مع فريق Claréa قبل الطلب. لا يمكن جمعها مع عرض آخر.",
    en: "One gift per browser during this offer. Try Again gives you another spin without a reference number. Confirm your gift with Claréa before ordering. Gifts cannot be combined with another offer.",
  },
  prizes: [
    { id: "save-10", label: { ar: "خصم 10%", en: "10% OFF" }, color: "#5C1A2B", ink: "#ffffff" },
    {
      id: "gift-wrap",
      label: { ar: "تغليف مجاني", en: "Free wrapping" },
      color: "#C9A05C",
      ink: "#ffffff",
    },
    { id: "save-5", label: { ar: "خصم 5%", en: "5% OFF" }, color: "#5C1A2B", ink: "#ffffff" },
    {
      id: "try-again",
      label: { ar: "حاولي مرة أخرى", en: "Try Again" },
      color: "#C9A05C",
      ink: "#ffffff",
    },
    {
      id: "free-shipping",
      label: { ar: "شحن مجاني", en: "Free Shipping" },
      color: "#5C1A2B",
      ink: "#ffffff",
    },
      { id: "save-5-extra", label: { ar: "خصم 5%", en: "5% OFF" }, color: "#C9A05C", ink: "#ffffff" },
  ],
};


