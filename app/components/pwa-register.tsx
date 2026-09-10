"use client";
import { useEffect } from "react";
export default function PwaRegister(){useEffect(()=>{if(process.env.NODE_ENV === "production" && "serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js", {scope:"/", updateViaCache:"none"}).catch(error=>console.error("PWA registration failed",error));}},[]);return null;}
