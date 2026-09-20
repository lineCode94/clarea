"use client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
export function confirmOrder(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    toast(
      ({ closeToast }) => (
        <div dir="rtl" className="w-full font-arabic text-[#412832]">
          <p className="m-0 text-lg font-bold">تأكيد الإجراء</p>
          <p className="my-3 text-sm leading-7">{message}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                finish(true);
                closeToast();
              }}
              className="rounded-xl bg-[#5c1a2b] px-5 py-2 text-white"
            >
              تأكيد
            </button>
            <button
              type="button"
              onClick={() => {
                finish(false);
                closeToast();
              }}
              className="rounded-xl border border-[#dfd2c8] px-5 py-2"
            >
              رجوع
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        icon: false,
        onClose: () => finish(false),
      },
    );
  });
}
export default function OrderToasts() {
  return (
    <ToastContainer
      position="top-center"
      rtl
      autoClose={4500}
      closeOnClick={false}
      toastStyle={{
        fontFamily: "inherit",
        borderRadius: 16,
        border: "1px solid #e8ddd5",
        background: "#fffdf9",
        color: "#412832",
      }}
      style={{ width: "min(440px, calc(100vw - 24px))", top: 16 }}
    />
  );
}
export { toast };
