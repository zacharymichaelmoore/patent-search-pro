"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StatusResponse {
  status: "pending" | "complete";
  downloadUrl?: string;
  fileName?: string;
  fileSize?: string;
  message: string;
}

export default function SearchStatusPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/get-status?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error("Failed to check status");
        }

        const data: StatusResponse = await response.json();
        setStatus(data);

        if (data.status === "complete") {
          setIsPolling(false);
          toast.success("Patent search completed!");
        }
      } catch (error) {
        console.error("Error checking status:", error);
        toast.error("Failed to check job status");
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 5 seconds (faster since VM search is quick)
    let pollInterval: NodeJS.Timeout | null = null;
    if (isPolling) {
      pollInterval = setInterval(checkStatus, 5000);
    }

    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(timeInterval);
    };
  }, [jobId, isPolling]);

  const formatElapsedTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    if (status?.downloadUrl) {
      window.open(status.downloadUrl, "_blank");
      toast.success("Download started!");
    }
  };

  const handleBackToHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Patent Assistant
          </h1>
          <p className="text-sm text-gray-600 mt-1">Prior Art Search Status</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border shadow-sm p-8">
            {/* Status Section */}
            <div className="text-center mb-8">
              {status?.status === "pending" ? (
                <>
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Search in Progress
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Your exhaustive prior art search is running. This may take
                    several minutes depending on the number of results.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                    <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-900">
                      Elapsed Time: {formatElapsedTime(elapsedTime)}
                    </span>
                  </div>
                </>
              ) : status?.status === "complete" ? (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Download className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Search Complete!
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Your patent search report is ready for download.
                  </p>
                  {status.fileSize && (
                    <p className="text-sm text-gray-500 mb-4">
                      File size: {status.fileSize}
                    </p>
                  )}
                  <Button
                    onClick={handleDownload}
                    size="lg"
                    className="mb-4"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download Report
                  </Button>
                  <p className="text-xs text-gray-500">
                    Report file: {status.fileName}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-16 w-16 text-gray-400 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Loading...
                  </h2>
                  <p className="text-gray-600">Checking job status...</p>
                </>
              )}
            </div>

            {/* Job Info */}
            <div className="border-t pt-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Job ID:</span>
                  <span className="font-mono text-gray-900">{jobId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      status?.status === "complete"
                        ? "text-green-600"
                        : "text-blue-600"
                    }`}
                  >
                    {status?.status === "complete" ? "Complete" : "Processing"}
                  </span>
                </div>
                {status?.message && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Message:</span>
                    <span className="text-gray-900">{status.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-6 mt-6">
              <Button
                variant="outline"
                onClick={handleBackToHome}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>

          {/* Help Text */}
          {status?.status === "pending" && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                What's happening?
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Searching USPTO patent database</li>
                <li>• Analyzing thousands of patent applications</li>
                <li>• Generating comprehensive CSV report</li>
                <li>• This page will update automatically</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
