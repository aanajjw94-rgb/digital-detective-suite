import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Upload, Navigation, Clock, Camera, FileDown, ExternalLink, Map, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { generateForensicPDF, ForensicReport } from "@/lib/pdfExport";
import { SaveToCase } from "./SaveToCase";

interface GPSData {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  latitudeRef: string;
  longitudeRef: string;
  timestamp: string | null;
  datestamp: string | null;
  direction: number | null;
  speed: number | null;
  accuracy: string;
}

interface ImageGPSResult {
  fileName: string;
  fileSize: string;
  preview: string | null;
  gpsData: GPSData | null;
  cameraInfo: {
    make: string | null;
    model: string | null;
    software: string | null;
  };
  dateTime: string | null;
  hasGPS: boolean;
}

export const GPSExtractor = () => {
  const [results, setResults] = useState<ImageGPSResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageGPSResult | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parseExifGPS = (arrayBuffer: ArrayBuffer): Partial<ImageGPSResult> => {
    const dataView = new DataView(arrayBuffer);
    const result: Partial<ImageGPSResult> = {
      gpsData: null,
      cameraInfo: { make: null, model: null, software: null },
      dateTime: null,
      hasGPS: false
    };

    // Check for JPEG
    if (dataView.getUint16(0) !== 0xFFD8) {
      return result;
    }

    let offset = 2;
    while (offset < dataView.byteLength - 2) {
      const marker = dataView.getUint16(offset);
      
      if (marker === 0xFFE1) { // APP1 - EXIF
        const length = dataView.getUint16(offset + 2);
        const exifStart = offset + 4;
        
        // Check for EXIF header
        const exifHeader = String.fromCharCode(
          dataView.getUint8(exifStart),
          dataView.getUint8(exifStart + 1),
          dataView.getUint8(exifStart + 2),
          dataView.getUint8(exifStart + 3)
        );
        
        if (exifHeader === 'Exif') {
          const tiffStart = exifStart + 6;
          const littleEndian = dataView.getUint16(tiffStart) === 0x4949;
          
          // Parse IFD0
          const ifd0Offset = tiffStart + dataView.getUint32(tiffStart + 4, littleEndian);
          const ifd0Count = dataView.getUint16(ifd0Offset, littleEndian);
          
          let gpsIFDPointer = 0;
          let exifIFDPointer = 0;
          
          for (let i = 0; i < ifd0Count; i++) {
            const entryOffset = ifd0Offset + 2 + i * 12;
            const tag = dataView.getUint16(entryOffset, littleEndian);
            
            if (tag === 0x010F) { // Make
              result.cameraInfo!.make = readExifString(dataView, entryOffset, tiffStart, littleEndian);
            } else if (tag === 0x0110) { // Model
              result.cameraInfo!.model = readExifString(dataView, entryOffset, tiffStart, littleEndian);
            } else if (tag === 0x0131) { // Software
              result.cameraInfo!.software = readExifString(dataView, entryOffset, tiffStart, littleEndian);
            } else if (tag === 0x0132) { // DateTime
              result.dateTime = readExifString(dataView, entryOffset, tiffStart, littleEndian);
            } else if (tag === 0x8825) { // GPS IFD Pointer
              gpsIFDPointer = dataView.getUint32(entryOffset + 8, littleEndian);
            } else if (tag === 0x8769) { // EXIF IFD Pointer
              exifIFDPointer = dataView.getUint32(entryOffset + 8, littleEndian);
            }
          }
          
          // Parse GPS IFD
          if (gpsIFDPointer > 0) {
            result.gpsData = parseGPSIFD(dataView, tiffStart + gpsIFDPointer, tiffStart, littleEndian);
            result.hasGPS = result.gpsData.latitude !== null && result.gpsData.longitude !== null;
          }
        }
        
        break;
      } else if ((marker & 0xFF00) === 0xFF00) {
        offset += 2 + dataView.getUint16(offset + 2);
      } else {
        break;
      }
    }

    return result;
  };

  const readExifString = (dataView: DataView, entryOffset: number, tiffStart: number, littleEndian: boolean): string | null => {
    try {
      const count = dataView.getUint32(entryOffset + 4, littleEndian);
      let valueOffset: number;
      
      if (count <= 4) {
        valueOffset = entryOffset + 8;
      } else {
        valueOffset = tiffStart + dataView.getUint32(entryOffset + 8, littleEndian);
      }
      
      let str = '';
      for (let i = 0; i < Math.min(count - 1, 100); i++) {
        const char = dataView.getUint8(valueOffset + i);
        if (char === 0) break;
        str += String.fromCharCode(char);
      }
      return str.trim() || null;
    } catch {
      return null;
    }
  };

  const parseGPSIFD = (dataView: DataView, ifdOffset: number, tiffStart: number, littleEndian: boolean): GPSData => {
    const gpsData: GPSData = {
      latitude: null,
      longitude: null,
      altitude: null,
      latitudeRef: 'N',
      longitudeRef: 'E',
      timestamp: null,
      datestamp: null,
      direction: null,
      speed: null,
      accuracy: 'Unknown'
    };

    try {
      const count = dataView.getUint16(ifdOffset, littleEndian);
      
      for (let i = 0; i < count; i++) {
        const entryOffset = ifdOffset + 2 + i * 12;
        const tag = dataView.getUint16(entryOffset, littleEndian);
        const type = dataView.getUint16(entryOffset + 2, littleEndian);
        const numValues = dataView.getUint32(entryOffset + 4, littleEndian);
        
        let valueOffset: number;
        if (type === 5 && numValues * 8 > 4) { // RATIONAL
          valueOffset = tiffStart + dataView.getUint32(entryOffset + 8, littleEndian);
        } else {
          valueOffset = entryOffset + 8;
        }

        switch (tag) {
          case 0x0001: // GPSLatitudeRef
            gpsData.latitudeRef = String.fromCharCode(dataView.getUint8(valueOffset));
            break;
          case 0x0002: // GPSLatitude
            gpsData.latitude = readGPSCoordinate(dataView, valueOffset, littleEndian);
            break;
          case 0x0003: // GPSLongitudeRef
            gpsData.longitudeRef = String.fromCharCode(dataView.getUint8(valueOffset));
            break;
          case 0x0004: // GPSLongitude
            gpsData.longitude = readGPSCoordinate(dataView, valueOffset, littleEndian);
            break;
          case 0x0006: // GPSAltitude
            const altNum = dataView.getUint32(valueOffset, littleEndian);
            const altDen = dataView.getUint32(valueOffset + 4, littleEndian);
            gpsData.altitude = altDen > 0 ? altNum / altDen : null;
            break;
          case 0x0007: // GPSTimeStamp
            const hour = dataView.getUint32(valueOffset, littleEndian) / dataView.getUint32(valueOffset + 4, littleEndian);
            const min = dataView.getUint32(valueOffset + 8, littleEndian) / dataView.getUint32(valueOffset + 12, littleEndian);
            const sec = dataView.getUint32(valueOffset + 16, littleEndian) / dataView.getUint32(valueOffset + 20, littleEndian);
            gpsData.timestamp = `${Math.floor(hour).toString().padStart(2, '0')}:${Math.floor(min).toString().padStart(2, '0')}:${Math.floor(sec).toString().padStart(2, '0')}`;
            break;
          case 0x0011: // GPSImgDirection
            const dirNum = dataView.getUint32(valueOffset, littleEndian);
            const dirDen = dataView.getUint32(valueOffset + 4, littleEndian);
            gpsData.direction = dirDen > 0 ? dirNum / dirDen : null;
            break;
          case 0x001D: // GPSDateStamp
            let dateStr = '';
            for (let j = 0; j < 10; j++) {
              dateStr += String.fromCharCode(dataView.getUint8(valueOffset + j));
            }
            gpsData.datestamp = dateStr.replace(/:/g, '-');
            break;
        }
      }

      // Apply reference directions
      if (gpsData.latitude !== null && gpsData.latitudeRef === 'S') {
        gpsData.latitude = -gpsData.latitude;
      }
      if (gpsData.longitude !== null && gpsData.longitudeRef === 'W') {
        gpsData.longitude = -gpsData.longitude;
      }

      // Determine accuracy
      if (gpsData.latitude !== null && gpsData.longitude !== null) {
        gpsData.accuracy = 'GPS';
      }

    } catch (error) {
      console.error('Error parsing GPS IFD:', error);
    }

    return gpsData;
  };

  const readGPSCoordinate = (dataView: DataView, offset: number, littleEndian: boolean): number | null => {
    try {
      const degrees = dataView.getUint32(offset, littleEndian) / dataView.getUint32(offset + 4, littleEndian);
      const minutes = dataView.getUint32(offset + 8, littleEndian) / dataView.getUint32(offset + 12, littleEndian);
      const seconds = dataView.getUint32(offset + 16, littleEndian) / dataView.getUint32(offset + 20, littleEndian);
      return degrees + minutes / 60 + seconds / 3600;
    } catch {
      return null;
    }
  };

  const formatCoordinate = (value: number, isLatitude: boolean): string => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    const direction = value >= 0 ? (isLatitude ? 'N' : 'E') : (isLatitude ? 'S' : 'W');
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newResults: ImageGPSResult[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseExifGPS(arrayBuffer);

        // Create preview
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        newResults.push({
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          preview,
          gpsData: parsed.gpsData || null,
          cameraInfo: parsed.cameraInfo || { make: null, model: null, software: null },
          dateTime: parsed.dateTime || null,
          hasGPS: parsed.hasGPS || false
        });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    setResults(prev => [...prev, ...newResults]);
    setIsProcessing(false);

    const gpsCount = newResults.filter(r => r.hasGPS).length;
    if (gpsCount > 0) {
      toast.success(`تم استخراج بيانات GPS من ${gpsCount} صورة!`);
    } else {
      toast.info("لم يتم العثور على بيانات GPS في الصور");
    }
  }, []);

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const exportPDF = () => {
    const gpsResults = results.filter(r => r.hasGPS);
    
    const report: ForensicReport = {
      toolName: 'GPS Extractor',
      toolNameAr: 'مستخرج إحداثيات GPS',
      generatedAt: new Date(),
      sections: [
        {
          title: 'Analysis Summary',
          table: {
            headers: ['Metric', 'Value'],
            rows: [
              ['Total Images Analyzed', results.length.toString()],
              ['Images with GPS Data', gpsResults.length.toString()],
              ['Images without GPS', (results.length - gpsResults.length).toString()],
            ]
          }
        },
        {
          title: 'GPS Location Data',
          table: {
            headers: ['File Name', 'Latitude', 'Longitude', 'Altitude', 'Date/Time'],
            rows: gpsResults.map(r => [
              r.fileName,
              r.gpsData?.latitude?.toFixed(6) || 'N/A',
              r.gpsData?.longitude?.toFixed(6) || 'N/A',
              r.gpsData?.altitude ? `${r.gpsData.altitude.toFixed(1)}m` : 'N/A',
              r.dateTime || r.gpsData?.datestamp || 'N/A'
            ])
          }
        },
        {
          title: 'Camera Information',
          table: {
            headers: ['File Name', 'Make', 'Model', 'Software'],
            rows: results.map(r => [
              r.fileName,
              r.cameraInfo.make || 'Unknown',
              r.cameraInfo.model || 'Unknown',
              r.cameraInfo.software || 'Unknown'
            ])
          }
        }
      ],
      summary: `Analyzed ${results.length} images. Found GPS coordinates in ${gpsResults.length} images. GPS data can be used to establish location history and timeline.`
    };

    generateForensicPDF(report);
    toast.success("تم تصدير التقرير بنجاح!");
  };

  const clearResults = () => {
    setResults([]);
    setSelectedImage(null);
  };

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <MapPin className="w-5 h-5" />
          مستخرج إحداثيات GPS
        </CardTitle>
        <CardDescription>
          استخراج وتحليل بيانات الموقع الجغرافي من الصور
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept="image/jpeg,image/jpg"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="gps-upload"
          />
          <label htmlFor="gps-upload" className="cursor-pointer">
            <MapPin className="w-12 h-12 mx-auto text-primary/60 mb-2" />
            <p className="text-muted-foreground">
              اسحب صور JPEG هنا أو اضغط للاختيار
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يمكن رفع عدة صور في وقت واحد
            </p>
          </label>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">جاري التحليل...</span>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="default">{results.length} صور</Badge>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                  {results.filter(r => r.hasGPS).length} مع GPS
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearResults}>
                  مسح
                </Button>
                <SaveToCase
                  toolName="GPS Extractor"
                  reportType="GPS Location Data"
                  reportData={{
                    totalImages: results.length,
                    imagesWithGPS: results.filter(r => r.hasGPS).length,
                    locations: results.filter(r => r.hasGPS).map(r => ({
                      fileName: r.fileName,
                      latitude: r.gpsData?.latitude,
                      longitude: r.gpsData?.longitude,
                      dateTime: r.dateTime
                    }))
                  }}
                  disabled={results.length === 0}
                />
                <Button size="sm" onClick={exportPDF}>
                  <FileDown className="w-4 h-4 ml-1" />
                  PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image List */}
              <ScrollArea className="h-80 border rounded-lg p-2">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImage(result)}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        selectedImage === result ? 'bg-primary/20' : 'bg-background/50 hover:bg-background/80'
                      }`}
                    >
                      {result.preview && (
                        <img 
                          src={result.preview} 
                          alt={result.fileName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">{result.fileName}</p>
                        <p className="text-xs text-muted-foreground">{result.fileSize}</p>
                      </div>
                      {result.hasGPS ? (
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Selected Image Details */}
              <div className="border rounded-lg p-4 bg-background/30">
                {selectedImage ? (
                  <div className="space-y-4">
                    {selectedImage.preview && (
                      <img 
                        src={selectedImage.preview} 
                        alt={selectedImage.fileName}
                        className="w-full h-40 object-contain rounded bg-background"
                      />
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">الكاميرا:</span>
                        <span className="font-mono">
                          {selectedImage.cameraInfo.make || selectedImage.cameraInfo.model || 'غير معروف'}
                        </span>
                      </div>

                      {selectedImage.dateTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">التاريخ:</span>
                          <span className="font-mono">{selectedImage.dateTime}</span>
                        </div>
                      )}

                      {selectedImage.hasGPS && selectedImage.gpsData && (
                        <>
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <Navigation className="w-4 h-4 text-green-500" />
                              <span className="font-medium text-green-500">بيانات GPS</span>
                            </div>

                            <div className="bg-green-500/10 rounded p-3 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">خط العرض:</span>
                                <span className="font-mono text-xs">
                                  {formatCoordinate(selectedImage.gpsData.latitude!, true)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">خط الطول:</span>
                                <span className="font-mono text-xs">
                                  {formatCoordinate(selectedImage.gpsData.longitude!, false)}
                                </span>
                              </div>
                              {selectedImage.gpsData.altitude !== null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">الارتفاع:</span>
                                  <span className="font-mono">{selectedImage.gpsData.altitude.toFixed(1)}m</span>
                                </div>
                              )}
                              {selectedImage.gpsData.direction !== null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">الاتجاه:</span>
                                  <span className="font-mono">{selectedImage.gpsData.direction.toFixed(1)}°</span>
                                </div>
                              )}
                            </div>

                            <Button
                              className="w-full mt-3"
                              onClick={() => openInMaps(
                                selectedImage.gpsData!.latitude!,
                                selectedImage.gpsData!.longitude!
                              )}
                            >
                              <Map className="w-4 h-4 ml-2" />
                              فتح في Google Maps
                              <ExternalLink className="w-3 h-3 mr-2" />
                            </Button>
                          </div>
                        </>
                      )}

                      {!selectedImage.hasGPS && (
                        <div className="bg-muted/30 rounded p-4 text-center">
                          <Compass className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground">لا توجد بيانات GPS</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            قد تكون الصورة تم التقاطها بدون GPS أو تم حذف البيانات
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>اختر صورة لعرض التفاصيل</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {results.length === 0 && !isProcessing && (
          <div className="text-center py-8 text-muted-foreground">
            <Map className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>قم برفع صور JPEG لاستخراج بيانات GPS</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
