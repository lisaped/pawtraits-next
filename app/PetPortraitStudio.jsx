import { useState, useRef, useCallback } from "react";

const STYLES = [
  {
    id: "oil", label: "Oil Painting", emoji: "🎨", desc: "Rich brushstrokes, old masters", price: 0,
    prompt: "oil painting portrait in the style of old masters, Rembrandt dramatic lighting, rich impasto brushstrokes, warm amber tones, dark vignette background, museum quality fine art, highly detailed fur texture",
  },
  {
    id: "watercolor", label: "Watercolour", emoji: "💧", desc: "Soft washes, dreamy edges", price: 0,
    prompt: "delicate watercolour illustration portrait, soft wet-on-wet washes, white paper texture showing through, loose expressive brushstrokes, pastel palette, fine art botanical painting style",
  },
  {
    id: "pencil", label: "Pencil & Charcoal", emoji: "✏️", desc: "Detailed graphite linework", price: 0,
    prompt: "highly detailed pencil sketch and charcoal drawing portrait, fine crosshatching, realistic graphite shading, white paper background, skilled hand-drawn illustration, studio art quality",
  },
  {
    id: "popArt", label: "Pop Art", emoji: "🌈", desc: "Bold colours, Warhol-inspired", price: 5,
    prompt: "Andy Warhol pop art screen print portrait, bold flat graphic colours, high contrast, halftone dot pattern, vibrant saturated palette, iconic 1960s pop art style, screen printed poster",
  },
  {
    id: "renaissance", label: "Renaissance Court", emoji: "🏛️", desc: "16th century Italian grandeur", price: 5,
    prompt: "Renaissance court portrait painting 16th century Italian style, elaborate ornate clothing with jewels and embroidery, rich jewel tones, classical composition, gold leaf details, Titian style masterwork",
  },
  {
    id: "royal", label: "Royal Portrait", emoji: "👑", desc: "Velvet cushion, crown, pedestal", price: 5,
    prompt: "regal royal portrait painting, pet seated on an ornate velvet cushion on a marble pedestal, wearing a tiny gold crown, baroque gold frame background, purple velvet draping, candelabras, palatial interior, majestic pose",
  },
];

const SIZES = [
  { id: "s8x10",  label: '8"×10"',  price: 29  },
  { id: "s11x14", label: '11"×14"', price: 49  },
  { id: "s16x20", label: '16"×20"', price: 79  },
  { id: "s20x24", label: '20"×24"', price: 109 },
  { id: "s24x30", label: '24"×30"', price: 149 },
];

const FRAMES = [
  { id: "none",   label: "No Frame",       price: 0,  color: "transparent", border: "#ccc"    },
  { id: "white",  label: "White Float",    price: 35, color: "#f5f5f0",     border: "#ddd"    },
  { id: "black",  label: "Matte Black",    price: 35, color: "#1a1a1a",     border: "#111"    },
  { id: "walnut", label: "Walnut Wood",    price: 55, color: "#5c3d2e",     border: "#3d2517" },
  { id: "gold",   label: "Antique Gold",   price: 65, color: "#b8860b",     border: "#8b6914" },
  { id: "silver", label: "Brushed Silver", price: 55, color: "#9e9e9e",     border: "#707070" },
];

const MOUNTS = [
  { id: "none",    label: "Print Only",        price: 0  },
  { id: "foam",    label: "Foam Mount",         price: 15 },
  { id: "canvas",  label: "Canvas Wrap",        price: 45 },
  { id: "acrylic", label: "Acrylic Face Mount", price: 75 },
];

const GEN_MESSAGES = [
  "Preparing your pet's portrait…",
  "Mixing virtual oils and pigments…",
  "Applying artistic strokes…",
  "Adding fine details…",
  "Almost ready — finishing touches…",
];

export default function PetPortraitStudio() {
  const [photoUrl, setPhotoUrl]             = useState(null);
  const [photoBase64, setPhotoBase64]       = useState(null);
  const [photoMediaType, setPhotoMediaType] = useState(null);
  const [selectedStyle, setSelectedStyle]   = useState(STYLES[0]);
  const [selectedSize, setSelectedSize]     = useState(SIZES[1]);
  const [selectedFrame, setSelectedFrame]   = useState(FRAMES[0]);
  const [selectedMount, setSelectedMount]   = useState(MOUNTS[0]);
  const [step, setStep]                     = useState("upload");
  const [petName, setPetName]               = useState("");
  const [aiDescription, setAiDescription]   = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generating, setGenerating]         = useState(false);
  const [genMessage, setGenMessage]         = useState("");
  const [genError, setGenError]             = useState(null);
  const [loadingDesc, setLoadingDesc]       = useState(false);
  const [dragging, setDragging]             = useState(false);
  const [quantity, setQuantity]             = useState(1);
  const [customPrompt, setCustomPrompt]     = useState("");
  const fileRef      = useRef();
  const msgInterval  = useRef(null);

  const total = (selectedSize.price + selectedStyle.price + selectedFrame.price + selectedMount.price) * quantity;

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoMediaType(file.type);
    setGeneratedImage(null);
    setGenError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(",")[1];
      setPhotoBase64(b64);
      fetchDescription(b64, file.type);
    };
    reader.readAsDataURL(file);
    setStep("style");
  };

  const fetchDescription = async (b64, mediaType) => {
    setLoadingDesc(true);
    try {
      const resp = await fetch("/api/describe-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mediaType }),
      });
      const data = await resp.json();
      setAiDescription(data.description || "");
    } catch {
      setAiDescription("A beloved companion, full of character and charm.");
    }
    setLoadingDesc(false);
  };

  const startMsgCycle = () => {
    let i = 0;
    setGenMessage(GEN_MESSAGES[0]);
    msgInterval.current = setInterval(() => {
      i = (i + 1) % GEN_MESSAGES.length;
      setGenMessage(GEN_MESSAGES[i]);
    }, 3500);
  };

  const generatePortrait = async () => {
    if (!photoBase64) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedImage(null);
    startMsgCycle();

    const prompt = customPrompt.trim()
      ? `${selectedStyle.prompt}, ${customPrompt.trim()}`
      : selectedStyle.prompt;

    try {
      // Step 1: Submit job — returns requestId immediately
      const submitResp = await fetch("/api/generate-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: photoBase64, mediaType: photoMediaType, prompt }),
      });
      const submitData = await submitResp.json();

      if (!submitData.requestId) {
        setGenError(submitData.error || "Failed to start generation.");
        clearInterval(msgInterval.current);
        setGenerating(false);
        return;
      }

      // Step 2: Poll for result every 3 seconds (up to 90 seconds)
      const { requestId } = submitData;
      let attempts = 0;
      const maxAttempts = 30;

      const poll = async () => {
        attempts++;
        try {
          const pollResp = await fetch(`/api/portrait-status?requestId=${requestId}`);
          const pollData = await pollResp.json();

          if (pollData.status === "COMPLETED" && pollData.imageUrl) {
            setGeneratedImage(pollData.imageUrl);
            setStep("order");
            clearInterval(msgInterval.current);
            setGenerating(false);
          } else if (pollData.status === "FAILED") {
            setGenError("Generation failed. Please try a different photo or style.");
            clearInterval(msgInterval.current);
            setGenerating(false);
          } else if (attempts >= maxAttempts) {
            setGenError("Generation timed out. Please try again.");
            clearInterval(msgInterval.current);
            setGenerating(false);
          } else {
            setTimeout(poll, 3000);
          }
        } catch {
          if (attempts >= maxAttempts) {
            setGenError("Connection error. Please try again.");
            clearInterval(msgInterval.current);
            setGenerating(false);
          } else {
            setTimeout(poll, 3000);
          }
        }
      };

      setTimeout(poll, 3000);

    } catch (err) {
      setGenError("Connection error. Please check your internet and try again.");
      clearInterval(msgInterval.current);
      setGenerating(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const resetAll = () => {
    setPhotoUrl(null); setPhotoBase64(null); setPhotoMediaType(null);
    setGeneratedImage(null); setAiDescription(""); setPetName("");
    setQuantity(1); setCustomPrompt(""); setGenError(null);
    setSelectedStyle(STYLES[0]); setSelectedFrame(FRAMES[0]); setSelectedMount(MOUNTS[0]);
    setStep("upload");
  };

  const framePad = selectedFrame.id !== "none" ? "16px" : "0";

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", fontFamily: "'Georgia', serif", color: "#2c2416" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .pf{font-family:'Playfair Display',Georgia,serif;}
        .lt{font-family:'Lato',sans-serif;}
        .card{background:#fff;border:1px solid #e8e0d4;border-radius:4px;box-shadow:0 2px 16px rgba(0,0,0,0.06);}
        .style-card{cursor:pointer;border:2px solid #e0d8cc;border-radius:6px;padding:14px 12px;background:#fff;transition:all 0.2s;text-align:center;}
        .style-card:hover{border-color:#8b6914;background:#fdf9f0;transform:translateY(-2px);}
        .style-card.active{border-color:#b8860b;background:#fdf6e3;box-shadow:0 4px 16px rgba(184,134,11,0.15);}
        .opt{cursor:pointer;border:2px solid #e0d8cc;border-radius:4px;padding:8px 14px;background:#fff;transition:all 0.2s;font-family:'Lato',sans-serif;font-size:13px;white-space:nowrap;}
        .opt:hover{border-color:#8b6914;}
        .opt.active{border-color:#b8860b;background:#fdf6e3;color:#7a5c00;font-weight:700;}
        .cta{background:#b8860b;color:#fff;border:none;padding:14px 36px;font-family:'Lato',sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border-radius:2px;transition:background 0.2s;font-weight:700;}
        .cta:hover{background:#9a6f09;}
        .cta:disabled{background:#c8a84b;cursor:not-allowed;}
        .drop{border:2px dashed #c8b89a;border-radius:8px;padding:60px 40px;text-align:center;cursor:pointer;transition:all 0.2s;background:#fdf9f4;}
        .drop:hover,.drop.drag{border-color:#b8860b;background:#fdf6e3;}
        .fswatch{width:28px;height:28px;border-radius:3px;cursor:pointer;border:2px solid transparent;transition:transform 0.15s;flex-shrink:0;}
        .fswatch:hover{transform:scale(1.15);}
        .fswatch.active{border-color:#b8860b;transform:scale(1.15);}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn 0.5s ease forwards;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{width:48px;height:48px;border:3px solid #e8e0d4;border-top-color:#b8860b;border-radius:50%;animation:spin 0.9s linear infinite;margin:0 auto 20px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .pulse{animation:pulse 1.5s infinite;}
        hr.div{border:none;border-top:1px solid #e8e0d4;margin:20px 0;}
        textarea{width:100%;padding:10px 14px;border:1px solid #e0d8cc;border-radius:3px;font-family:Georgia,serif;font-size:13px;background:#fdf9f4;color:#2c2416;outline:none;resize:vertical;line-height:1.5;}
        textarea:focus{border-color:#b8860b;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-thumb{background:#c8b89a;border-radius:3px;}
      `}</style>

      {/* HEADER */}
      <header style={{ borderBottom:"1px solid #e0d8cc", background:"#fff", padding:"18px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }} onClick={resetAll}>
          <div style={{ fontSize:28 }}>🐾</div>
          <div>
            <div className="pf" style={{ fontSize:22, fontWeight:700 }}>Pawtraits</div>
            <div className="lt" style={{ fontSize:10, letterSpacing:"3px", color:"#9a7a50", textTransform:"uppercase" }}>Fine Art Pet Portraits</div>
          </div>
        </div>
        {step !== "upload" && (
          <div className="lt" style={{ fontSize:13, color:"#9a7a50", display:"flex", gap:16, alignItems:"center" }}>
            {[["style","Style"],["order","Customise"],["confirm","Complete"]].map(([s,label],i) => {
              const idx = ["style","order","confirm"].indexOf(step);
              return (
                <span key={s} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background: step===s?"#b8860b": idx>i?"#8b6914":"#ddd", transition:"background 0.3s", display:"inline-block" }} />
                  {label}
                  {i<2 && <span style={{ color:"#ddd" }}>—</span>}
                </span>
              );
            })}
          </div>
        )}
        <div className="lt" style={{ fontSize:12, color:"#c8a060", letterSpacing:"1px" }}>✦ Free shipping over $99 ✦</div>
      </header>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px" }}>

        {/* UPLOAD */}
        {step === "upload" && (
          <div className="fi" style={{ maxWidth:640, margin:"0 auto", textAlign:"center" }}>
            <p className="lt" style={{ fontSize:11, letterSpacing:"4px", color:"#b8860b", textTransform:"uppercase", marginBottom:12 }}>Step 1 of 3</p>
            <h1 className="pf" style={{ fontSize:48, fontWeight:700, lineHeight:1.15, marginBottom:16 }}>
              Your pet, <em>transformed</em><br/>into fine art.
            </h1>
            <p className="lt" style={{ fontSize:15, color:"#7a6a50", lineHeight:1.7, marginBottom:48 }}>
              Upload a clear photo. Our AI genuinely renders it as artwork — then we print, mount, and frame it to order.
            </p>
            <div className={`drop ${dragging?"drag":""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={onDrop}
            >
              <div style={{ fontSize:56, marginBottom:16 }}>📸</div>
              <p className="pf" style={{ fontSize:20, marginBottom:8, color:"#5c4a2a" }}>Drop your photo here</p>
              <p className="lt" style={{ fontSize:13, color:"#9a8a6a" }}>or click to browse — JPG, PNG, WEBP</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
            <div style={{ marginTop:48, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:24 }}>
              {[
                {icon:"🤖",title:"Real AI Artwork",desc:"Genuine AI-generated portraits, not filters"},
                {icon:"🖼️",title:"Museum Quality",desc:"Giclée printing on archival paper"},
                {icon:"💝",title:"100% Guaranteed",desc:"Love it or we regenerate & reprint, free"},
              ].map(f=>(
                <div key={f.title} style={{ textAlign:"center", padding:"20px 12px" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>{f.icon}</div>
                  <div className="pf" style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>{f.title}</div>
                  <div className="lt" style={{ fontSize:12, color:"#9a8a6a", lineHeight:1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STYLE */}
        {step === "style" && photoUrl && (
          <div className="fi" style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:40, alignItems:"start" }}>
            <div>
              <p className="lt" style={{ fontSize:11, letterSpacing:"4px", color:"#b8860b", textTransform:"uppercase", marginBottom:8 }}>Your Photo</p>
              <img src={photoUrl} alt="Your pet" style={{ width:"100%", maxHeight:420, objectFit:"cover", borderRadius:4, boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }} />
              {aiDescription && (
                <div className="card fi" style={{ marginTop:20, padding:"18px 22px", borderLeft:"3px solid #b8860b" }}>
                  <p className="pf" style={{ fontSize:15, fontStyle:"italic", lineHeight:1.7, color:"#5c3d2e" }}>"{aiDescription}"</p>
                </div>
              )}
              {loadingDesc && <div className="lt pulse" style={{ marginTop:14, fontSize:12, color:"#b8860b", letterSpacing:2 }}>✦ Reading your pet's character…</div>}
            </div>
            <div>
              <h2 className="pf" style={{ fontSize:30, fontWeight:700, marginBottom:4 }}>Choose Your Art Style</h2>
              <p className="lt" style={{ fontSize:13, color:"#9a7a50", marginBottom:24 }}>Our AI genuinely transforms your photo into each style — 15–30 seconds per generation.</p>

              <div style={{ marginBottom:20 }}>
                <label className="lt" style={{ fontSize:11, letterSpacing:"2px", textTransform:"uppercase", color:"#7a6a50", display:"block", marginBottom:8 }}>Pet's Name (optional)</label>
                <input value={petName} onChange={e=>setPetName(e.target.value)} placeholder="e.g. Biscuit, Luna, Milo…"
                  style={{ width:"100%", padding:"10px 14px", border:"1px solid #e0d8cc", borderRadius:3, fontFamily:"Georgia,serif", fontSize:14, background:"#fdf9f4", color:"#2c2416", outline:"none" }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {STYLES.map(s=>(
                  <div key={s.id} className={`style-card ${selectedStyle.id===s.id?"active":""}`}
                    onClick={()=>{setSelectedStyle(s);setGeneratedImage(null);setGenError(null);}}>
                    <div style={{ fontSize:26, marginBottom:6 }}>{s.emoji}</div>
                    <div className="lt" style={{ fontSize:13, fontWeight:700, color:"#2c2416" }}>{s.label}</div>
                    <div className="lt" style={{ fontSize:11, color:"#9a7a50", marginTop:3, lineHeight:1.4 }}>{s.desc}</div>
                    {s.price>0 && <div className="lt" style={{ fontSize:10, color:"#b8860b", marginTop:4, letterSpacing:1 }}>+${s.price}</div>}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:20 }}>
                <label className="lt" style={{ fontSize:11, letterSpacing:"2px", textTransform:"uppercase", color:"#7a6a50", display:"block", marginBottom:8 }}>Add Your Own Details (optional)</label>
                <textarea rows={2} value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)}
                  placeholder={`e.g. "wearing a tiny bow tie" or "surrounded by autumn leaves"…`} />
                <p className="lt" style={{ fontSize:11, color:"#b8a070", marginTop:5 }}>Blended into the AI prompt for extra personalisation.</p>
              </div>

              <button className="cta" style={{ width:"100%", fontSize:13 }} onClick={generatePortrait} disabled={generating}>
                {generating ? genMessage || "Generating…" : "✦ Generate AI Portrait"}
              </button>

              {generating && (
                <div style={{ textAlign:"center", marginTop:24 }}>
                  <div className="spinner" />
                  <p className="pf" style={{ fontSize:16, fontStyle:"italic", color:"#7a6a50" }}>{genMessage}</p>
                  <p className="lt" style={{ fontSize:12, color:"#b8a070", marginTop:8 }}>This takes 15–30 seconds…</p>
                </div>
              )}

              {genError && (
                <div style={{ marginTop:16, padding:"12px 16px", background:"#fff5f5", border:"1px solid #f0d0d0", borderRadius:4 }}>
                  <p className="lt" style={{ fontSize:13, color:"#c0392b" }}>⚠️ {genError}</p>
                  <p className="lt" style={{ fontSize:12, color:"#9a7a70", marginTop:6 }}>Check your FAL_API_KEY is set in Vercel environment variables.</p>
                </div>
              )}

              <button className="lt" onClick={resetAll} style={{ marginTop:12, background:"none", border:"none", color:"#9a7a50", fontSize:12, cursor:"pointer", width:"100%", textAlign:"center" }}>
                ← Upload a different photo
              </button>
            </div>
          </div>
        )}

        {/* ORDER */}
        {step === "order" && generatedImage && (
          <div className="fi" style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:40, alignItems:"start" }}>
            <div>
              <p className="lt" style={{ fontSize:11, letterSpacing:"4px", color:"#b8860b", textTransform:"uppercase", marginBottom:8 }}>Your AI Portrait — {selectedStyle.label}</p>
              <div style={{ display:"inline-block", padding:framePad, background:selectedFrame.color, border:selectedFrame.id!=="none"?`3px solid ${selectedFrame.border}`:"none", borderRadius:2, boxShadow:selectedFrame.id!=="none"?"0 8px 40px rgba(0,0,0,0.25)":"0 4px 20px rgba(0,0,0,0.1)", transition:"all 0.3s", maxWidth:"100%" }}>
                <img src={generatedImage} alt="AI portrait" style={{ display:"block", maxWidth:"100%", maxHeight:520, objectFit:"cover" }} />
              </div>
              <div style={{ marginTop:14, display:"flex", gap:10 }}>
                <button className="lt opt" onClick={()=>{setGeneratedImage(null);setStep("style");}}>← Regenerate / Change Style</button>
                <a href={generatedImage} download="pawtraits.jpg" className="lt opt" style={{ textDecoration:"none" }}>↓ Save Image</a>
              </div>
              {aiDescription && (
                <div className="card" style={{ marginTop:20, padding:"16px 20px", borderLeft:"3px solid #b8860b" }}>
                  <p className="pf" style={{ fontSize:14, fontStyle:"italic", lineHeight:1.7, color:"#5c3d2e" }}>"{aiDescription}"</p>
                </div>
              )}
            </div>

            <div style={{ position:"sticky", top:90 }}>
              <h2 className="pf" style={{ fontSize:26, fontWeight:700, marginBottom:4 }}>Size, Frame & Finish</h2>
              <p className="lt" style={{ fontSize:13, color:"#9a7a50", marginBottom:24 }}>Craft the perfect piece for your home.</p>

              <div style={{ marginBottom:20 }}>
                <label className="lt" style={{ fontSize:11, letterSpacing:"2px", textTransform:"uppercase", color:"#7a6a50", display:"block", marginBottom:10 }}>Print Size</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {SIZES.map(s=><button key={s.id} className={`opt ${selectedSize.id===s.id?"active":""}`} onClick={()=>setSelectedSize(s)}>{s.label} — ${s.price}</button>)}
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <label className="lt" style={{ fontSize:11, letterSpacing:"2px", textTransform:"uppercase", color:"#7a6a50", display:"block", marginBottom:10 }}>Frame</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
                  {FRAMES.map(f=>(
                    <div key={f.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div className={`fswatch ${selectedFrame.id===f.id?"active":""}`}
                        style={{ background:f.id==="none"?"repeating-linear-gradient(45deg,#f0ece4,#f0ece4 4px,#e8e0d4 4px,#e8e0d4 8px)":f.color, borderColor:f.id==="none"?"#ccc":f.border }}
                        onClick={()=>setSelectedFrame(f)} />
                      <span className="lt" style={{ fontSize:9, color:"#9a7a50", textAlign:"center", maxWidth:52, lineHeight:1.2 }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                {selectedFrame.price>0 && <p className="lt" style={{ fontSize:12, color:"#b8860b", marginTop:8 }}>{selectedFrame.label} +${selectedFrame.price}</p>}
              </div>

              <div style={{ marginBottom:20 }}>
                <label className="lt" style={{ fontSize:11, letterSpacing:"2px", textTransform:"uppercase", color:"#7a6a50", display:"block", marginBottom:10 }}>Mounting</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {MOUNTS.map(m=><button key={m.id} className={`opt ${selectedMount.id===m.id?"active":""}`} onClick={()=>setSelectedMount(m)}>{m.label}{m.price>0?` +$${m.price}`:""}</button>)}
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <label className="lt" style={{ fontSize:11, letterSpacing:"2px", textTransform:"uppercase", color:"#7a6a50", display:"block", marginBottom:10 }}>Quantity</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[1,2,3,4,5].map(q=><button key={q} className={`opt ${quantity===q?"active":""}`} style={{ minWidth:44 }} onClick={()=>setQuantity(q)}>{q}</button>)}
                </div>
              </div>

              <hr className="div" />
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {[["Style",selectedStyle.label,selectedStyle.price>0?`+$${selectedStyle.price}`:"Included"],["Size",selectedSize.label,`$${selectedSize.price}`],["Frame",selectedFrame.label,selectedFrame.price>0?`+$${selectedFrame.price}`:"Included"],["Mount",selectedMount.label,selectedMount.price>0?`+$${selectedMount.price}`:"Included"],["Qty",`×${quantity}`,""]].map(([k,v,p])=>(
                  <div key={k} className="lt" style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"#9a7a50" }}>{k}</span>
                    <span style={{ fontWeight:600 }}>{v} <span style={{ color:"#b8860b" }}>{p}</span></span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
                <span className="pf" style={{ fontSize:18, fontWeight:600 }}>Total</span>
                <span className="pf" style={{ fontSize:32, fontWeight:700, color:"#b8860b" }}>${total}</span>
              </div>
              <button className="cta" style={{ width:"100%" }} onClick={()=>setStep("confirm")}>Place Order</button>
              <p className="lt" style={{ fontSize:11, color:"#9a8a6a", textAlign:"center", marginTop:10, lineHeight:1.5 }}>🔒 Secure checkout · Printed within 2–3 business days</p>
            </div>
          </div>
        )}

        {/* CONFIRM */}
        {step === "confirm" && (
          <div className="fi" style={{ maxWidth:580, margin:"0 auto", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:24 }}>🎉</div>
            <h2 className="pf" style={{ fontSize:42, fontWeight:700, marginBottom:16 }}>Order Received!</h2>
            {petName && <p className="pf" style={{ fontSize:20, fontStyle:"italic", color:"#b8860b", marginBottom:16 }}>{petName}'s portrait is in good hands.</p>}
            <p className="lt" style={{ fontSize:15, color:"#7a6a50", lineHeight:1.8, marginBottom:32 }}>
              Your <strong>{selectedStyle.label}</strong> portrait ({selectedSize.label}) will be expertly printed and shipped within 5–7 business days.
            </p>
            {generatedImage && (
              <div style={{ marginBottom:32, display:"inline-block", padding:framePad, background:selectedFrame.color, border:selectedFrame.id!=="none"?`3px solid ${selectedFrame.border}`:"none", boxShadow:selectedFrame.id!=="none"?"0 8px 32px rgba(0,0,0,0.2)":"none" }}>
                <img src={generatedImage} alt="portrait" style={{ display:"block", maxWidth:260, maxHeight:260, objectFit:"cover" }} />
              </div>
            )}
            <div className="card" style={{ padding:"24px 28px", marginBottom:32, textAlign:"left" }}>
              <p className="lt" style={{ fontSize:11, letterSpacing:"3px", textTransform:"uppercase", color:"#b8860b", marginBottom:14 }}>What Happens Next</p>
              {[["✅","Quality review","AI artwork inspected before printing"],["🖨️","Precision printing","Giclée on archival paper"],["📦","Careful packaging","Wrapped in tissue, boxed to perfection"],["🚀","Express dispatch","Shipped with tracking in 3 business days"]].map(([i,t,d])=>(
                <div key={t} style={{ display:"flex", gap:14, marginBottom:14, alignItems:"flex-start" }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{i}</span>
                  <div>
                    <div className="lt" style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{t}</div>
                    <div className="lt" style={{ fontSize:12, color:"#9a7a50" }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="cta" onClick={resetAll}>Order Another Portrait</button>
            <p className="lt" style={{ marginTop:28, fontSize:12, color:"#c0a878" }}>Questions? Email hello@pawtrait.au</p>
          </div>
        )}
      </main>

      <footer style={{ marginTop:80, borderTop:"1px solid #e0d8cc", background:"#fff", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div className="pf" style={{ fontSize:16, color:"#9a7a50" }}>🐾 Pawtraits</div>
        <div className="lt" style={{ fontSize:12, color:"#c0a878", letterSpacing:1 }}>✦ AI-generated artwork · Giclée printing · Ships worldwide ✦</div>
        <div className="lt" style={{ fontSize:12, color:"#9a7a50" }}>© 2026 Pawtraits · pawtrait.au</div>
      </footer>
    </div>
  );
}
