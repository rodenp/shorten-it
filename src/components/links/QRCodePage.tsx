"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, Copy, ExternalLink, BarChart2, Trash2, Download, ImagePlus, X, Save, Divide  } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import QRCode from 'react-qr-code';
import { LinkSettingsSidebar } from "@/components/layout/link-settings-side-bar";
import { useLinkParams } from '@/context/LinkParamsContext';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { LinkItem } from '@/types'; 
import { mainModule } from "process";

export function QRCodePage() {
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("Medium");
  const [borderRadius, setBorderRadius] = useState(0);
  const [foregroundColor, setForegroundColor] = useState("#4a4a4aff");
  const [backgroundColor, setBackgroundColor] = useState("#ffffffff");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<LinkItem | null>(null);

  const {
      id,
      originalUrl,
      shortUrl,
      slug,
      title,
      tags,
      folderId,
      domainId,
      targets,
      abTestConfig,
      isCloaked,
      rotationStart,
      rotationEnd,
      clickLimit,
      getCurrentLinkItem,
    } = useLinkParams();

  useEffect(() => {
    const current = getCurrentLinkItem();

    // If no ID or mismatched ID, update originalRef
    if (current.id && originalRef.current?.id !== current.id) {
      originalRef.current = structuredClone(current);
      console.log('✅ URLRotatePage:Reinitialized original context for new link:', originalRef.current);
    }
  }, [id]);


  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadSvg = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'qrcode.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = async (format: 'png' | 'svg' | 'pdf') => {
    if (!qrRef.current) return;
    const canvas = await html2canvas(qrRef.current);
    const dataUrl = canvas.toDataURL("image/png");

    if (format === "png") {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "qrcode.png";
      link.click();
    } else if (format === "pdf") {
      const pdf = new jsPDF();
      pdf.addImage(dataUrl, "PNG", 10, 10, 80, 80);
      pdf.save("qrcode.pdf");
    } else if (format === "svg") {
      alert("SVG export is not supported using html2canvas. Use direct SVG renderers if required.");
    }
  };

  const clearLogo = () => setLogoUrl(null);

  const handleSave = async () => {
    try {

        let payload: any;
        const method = id ? 'PATCH' : 'POST';
        const url = id ? `/api/links/${id}` : '/api/links';

        const basePayload = {
          errorCorrectionLevel,
          borderRadius,
          foregroundColor,
          backgroundColor,
          hasLogo: Boolean(logoUrl),
        };

        if (method === 'POST') {
            payload = {
              ...(originalUrl != null && { originalUrl }),
              ...(slug != null && { slug }),
              ...(title != null && { title }),
              ...(tags != null && { tags }),
              ...(folderId != null && { folderId }),
              ...(domainId != null && { domainId }),
              ...(targets != null && { targets }),
              ...(abTestConfig?.variantAUrl !== '' && { abTestConfig }), 
              ...(isCloaked != null && { isCloaked }),
              ...(shortUrl != null && { shortUrl }),
              ...(rotationStart != null && { rotationStart }),
              ...(rotationEnd != null && { rotationEnd }),
              ...(clickLimit != null && { clickLimit }),
              ...basePayload,
            };
        } else {
            // For PATCH, send everything, including nulls to explicitly clear fields
            payload = {
              originalUrl,
              slug,
              title,
              tags,
              folderId,
              domainId,
              ...basePayload,
            };
        }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save QR settings");

      console.log("Saved QR code settings.");
    } catch (err) {
      console.error("Error saving QR code settings:", err);
    }
  };

  return (
    <div className="flex p-8 space-x-6">
      <LinkSettingsSidebar linkId="" active="" />

      <main className="flex-1 p-8 space-y-6 overflow-auto">
        <header className="flex items-center justify-between">
          <Link href="/links" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5 mr-2" /> LINK LIST
          </Link>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generation</CardTitle>
            <CardDescription>Promote your short URL on printed documents & marketing materials using the QR-code.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center space-x-3 text-muted-foreground">
              <Link href={shortUrl} className="underline text-primary">
                {shortUrl}
              </Link>
              <Copy className="cursor-pointer hover:text-primary" />
              <ExternalLink className="cursor-pointer hover:text-primary" />
              <BarChart2 className="cursor-pointer hover:text-primary" />
              <Trash2 className="cursor-pointer hover:text-destructive" />
            </div>

            <div className="flex p-6 space-x-6">
              {/* Left side: QR Code image + download buttons */}
              <div className="flex flex-col items-center space-y-4">
                  <div ref={qrRef} className="relative w-64 h-64 bg-white p-2">
                    <QRCode
                      value={shortUrl}
                      bgColor={backgroundColor}
                      fgColor={foregroundColor}
                      level={errorCorrectionLevel.charAt(0)}
                      style={{ width: '100%', height: '100%' }}
                    />
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="QR Logo"
                        className="absolute w-16 h-16 rounded-full object-contain inset-0 m-auto z-10"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                  </div>
                  <div className="flex space-x-4">
                    <Button variant="outline" size="sm" onClick={() => downloadImage("png")}> 
                      <Download className="w-4 h-4 mr-1" /> PNG
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadSvg}> 
                      <Download className="w-4 h-4 mr-1" /> SVG
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadImage("pdf")}> 
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </div>
              </div>
              {/* Right side: customization controls */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Error correction level</label>
                  <select
                    value={errorCorrectionLevel}
                    onChange={(e) => setErrorCorrectionLevel(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="Low">Low (7%)</option>
                    <option value="Medium">Medium (15%)</option>
                    <option value="Quartile">Quartile (25%)</option>
                    <option value="High">High (30%)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Damage resistance while printing
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Border radius</label>
                  <Slider
                    value={[borderRadius]}
                    onValueChange={([v]) => setBorderRadius(v)}
                    max={5}
                    step={1}
                  />
                </div>

                <div className="flex items-center space-x-2 border border-dashed border-green-500 rounded-lg p-3">
                  <label className="flex items-center cursor-pointer text-green-600 text-sm">
                    <ImagePlus className="w-4 h-4 mr-2" />
                    <span>{logoUrl ? "Change logo image" : "Add logo image"}</span>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <Button variant="ghost" size="icon" onClick={clearLogo}>
                      <X className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Foreground color</label>
                  <Input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Background color</label>
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="pt-2 flex justify-between">
                  <Button variant="ghost" className="text-green-600">CANCEL</Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}