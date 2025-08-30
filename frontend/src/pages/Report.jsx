import { useState } from "react";
import Button from "../Components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/Card";
import { Input } from "../Components/Input";
import { Label } from "../Components/Label";
import { Textarea } from "../Components/Textarea";
import { Progress } from "../Components/Progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../Components/Select";
import {
  Camera,
  MapPin,
  Upload,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Navbar from "../Components/Navbar";
import { motion, AnimatePresence } from "framer-motion";

const Report = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    urgency: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    // Step 1 validation
    if (currentStep === 1) {
      if (
        !formData.title ||
        !formData.category ||
        !formData.urgency ||
        !formData.description
      ) {
        alert("Please fill all required fields before continuing.");
        return; // Stop if any required field is missing
      }
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (!formData.location) {
        alert("Please provide a location before continuing.");
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-ocean-light/20 to-blue-50 relative">
        <Navbar />
        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="shadow-success border-success/20 backdrop-blur-xl bg-white/70">
              <CardContent className="text-center py-12">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-primary mb-4">
                  Report Submitted Successfully!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Thank you for helping protect our mangroves 🌱. Your report
                  has been submitted and will be reviewed.
                </p>
                <div className="bg-secondary/30 rounded-lg p-4 mb-6 border border-secondary/40">
                  <p className="text-sm text-muted-foreground">
                    Report ID:{" "}
                    <span className="font-mono text-primary">
                      #MG-2024-{Math.floor(Math.random() * 1000)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="hero"
                    onClick={() => window.location.reload()}
                    className="shadow-lg hover:scale-105 transition"
                  >
                    Submit Another Report
                  </Button>
                  <Button
                    variant="mint"
                    asChild
                    className="shadow-lg hover:scale-105 transition"
                  >
                    <a href="/status">Track This Report</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-ocean-light/10 to-green-50">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-[url('/mangrove-bg.jpg')] bg-cover bg-center opacity-30 blur-md"></div>
      <div className="relative z-10">
        <Navbar />

        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-2">
                Report a Mangrove Issue
              </h1>
              <p className="text-muted-foreground">
                Help us protect our coastal guardians by reporting threats or
                conservation opportunities.
              </p>
            </div>

            <Card className="shadow-md backdrop-blur-sm bg-white/60 rounded-2xl border border-neutral-200">
              <CardHeader>
                <div className="flex justify-between items-center mb-4">
                  <CardTitle className="font-semibold">
                    Step {currentStep} of {totalSteps}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {currentStep === 1 && "Report Details"}
                    {currentStep === 2 && "Location & Evidence"}
                    {currentStep === 3 && "Review & Submit"}
                  </span>
                </div>
                <Progress value={progress} className="h-2 rounded-full" />
              </CardHeader>

              <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="title">Report Title</Label>
                        <Input
                          id="title"
                          placeholder="Brief description of the issue"
                          value={formData.title}
                          onChange={(e) =>
                            updateFormData("title", e.target.value)
                          }
                          required
                          className="transition focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            updateFormData("category", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select report category" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-white shadow-lg rounded-lg border border-neutral-200">
                            <SelectItem
                              value="threat"
                              className="hover:bg-green-100"
                            >
                              🌪 Environmental Threat
                            </SelectItem>
                            <SelectItem
                              value="conservation"
                              className="hover:bg-green-100"
                            >
                              🌱 Conservation Opportunity
                            </SelectItem>
                            <SelectItem
                              value="restoration"
                              className="hover:bg-green-100"
                            >
                              🌊 Restoration Project
                            </SelectItem>
                            <SelectItem
                              value="education"
                              className="hover:bg-green-100"
                            >
                              📖 Community Education
                            </SelectItem>
                            <SelectItem
                              value="research"
                              className="hover:bg-green-100"
                            >
                              🔬 Research & Monitoring
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="urgency">Urgency Level</Label>
                        <Select
                          value={formData.urgency}
                          onValueChange={(value) =>
                            updateFormData("urgency", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="How urgent is this issue?" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-white shadow-lg rounded-lg border border-neutral-200">
                            <SelectItem
                              value="low"
                              className="hover:bg-green-100"
                            >
                              🟢 Low - General observation
                            </SelectItem>
                            <SelectItem
                              value="medium"
                              className="hover:bg-green-100"
                            >
                              🟡 Medium - Needs attention
                            </SelectItem>
                            <SelectItem
                              value="high"
                              className="hover:bg-green-100"
                            >
                              🟠 High - Immediate action required
                            </SelectItem>
                            <SelectItem
                              value="critical"
                              className="hover:bg-green-100"
                            >
                              🔴 Critical - Emergency situation
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">
                          Detailed Description
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Provide detailed information..."
                          rows={4}
                          value={formData.description}
                          onChange={(e) =>
                            updateFormData("description", e.target.value)
                          }
                          required
                          className="transition focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="location"
                            placeholder="Enter the specific location or coordinates"
                            value={formData.location}
                            onChange={(e) =>
                              updateFormData("location", e.target.value)
                            }
                            className="pl-10 transition focus:ring-2 focus:ring-emerald-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-4 border-2 border-emerald-300 rounded-xl p-8 text-center bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer flex flex-col items-center">
                        <Camera className="h-14 w-14 text-emerald-400 mb-4" />
                        <p className="text-muted-foreground mb-2 max-w-xs">
                          Drag & drop photos or click to upload
                        </p>
                        <label
                          htmlFor="file-upload"
                          className="inline-flex cursor-pointer select-none items-center rounded-md bg-mint-500 px-4 py-2 text-sm font-medium shadow-sm text-white hover:shadow-md"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Files
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          capture="environment" // forces camera, rear-facing if available
                          className="hidden"
                          onChange={(e) => {
                            // Handle selected files here if needed
                            const files = e.target.files;
                            // e.g. update state or validate files...
                          }}
                        />

                        <p className="text-xs text-muted-foreground mt-2">
                          Max 5 files, 10MB each
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="bg-secondary/20 rounded-lg p-6 border border-secondary/40">
                        <h3 className="font-semibold text-primary mb-4 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                          Review Your Report
                        </h3>

                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="font-medium">Title:</span>{" "}
                            {formData.title || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span>{" "}
                            {formData.category || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Urgency:</span>{" "}
                            {formData.urgency || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>{" "}
                            {formData.location || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Description:</span>
                            <p className="mt-1 text-muted-foreground">
                              {formData.description || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                        <p className="text-sm text-muted-foreground">
                          ✅ By submitting, you confirm the information is
                          accurate and agree to our environmental community
                          guidelines.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex space-x-3 pt-4">
                  {currentStep > 1 && (
                    <Button
                      variant="mint"
                      onClick={handleBack}
                      className="flex-1 shadow-md hover:scale-105 transition"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    variant={currentStep === totalSteps ? "success" : "hero"}
                    onClick={handleNext}
                    className="flex-1 shadow-md hover:scale-105 transition"
                  >
                    {currentStep === totalSteps
                      ? "🚀 Submit Report"
                      : "Continue →"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Report;
