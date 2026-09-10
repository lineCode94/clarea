"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function InstallApp({lang}:{lang:"ar"|"en"}) {
 const [prompt,setPrompt]=useState<InstallEvent|null>(null);const [ios,setIos]=useState(false);const [installed,setInstalled]=useState(false);const [help,setHelp]=useState(false);
 useEffect(()=>{const media=window.matchMedia("(display-mode: standalone)");const standalone=()=>setInstalled(media.matches || !!(navigator as Navigator & {standalone?:boolean}).standalone);standalone();setIos(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1));const ready=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};const done=()=>{setInstalled(true);setPrompt(null);};window.addEventListener("beforeinstallprompt",ready);window.addEventListener("appinstalled",done);media.addEventListener("change",standalone);return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",done);media.removeEventListener("change",standalone);};},[]);
 if(installed||(!prompt&&!ios))return null;
 return <div className="px-6 py-5 text-center"><button className="min-h-11 rounded-lg border border-brand px-6 py-2 font-bold text-brand" onClick={async()=>{if(prompt){await prompt.prompt();await prompt.userChoice;setPrompt(null);}else setHelp(!help);}}>{lang==="ar"?"ثبّتي تطبيق Claréa":"Install Claréa"}</button>{help&&<p className="mx-auto mt-3 max-w-md text-sm">{lang==="ar"?"من قائمة المشاركة في Safari، اختاري «إضافة إلى الشاشة الرئيسية» ثم «إضافة».":"In Safari, open Share, choose Add to Home Screen, then Add."}</p>}</div>;
}
