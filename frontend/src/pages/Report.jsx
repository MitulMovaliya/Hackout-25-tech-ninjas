import { useState } from "react";
import Button from "../Components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/Card";
import { Input } from "../Components/Input";
import { Label } from "../Components/Label";
import { Textarea } from "../Components/Textarea";
import { Progress } from "../Components/Progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Components/Select";
import { Camera, MapPin, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import Navbar from "../Components/Navbar";

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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="shadow-success border-success/20">
              <CardContent className="text-center py-12">
                <div className="bg-gradient-success rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-success-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-primary mb-4">Report Submitted Successfully!</h2>
                <p className="text-muted-foreground mb-6">
                  Thank you for helping protect our mangroves. Your report has been submitted and will be reviewed by our community team.
                </p>
                <div className="bg-secondary/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    Report ID: <span className="font-mono text-primary">#MG-2024-{Math.floor(Math.random() * 1000)}</span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="hero" onClick={() => window.location.reload()}>
                    Submit Another Report
                  </Button>
                  <Button variant="mint" asChild>
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Report a Mangrove Issue</h1>
            <p className="text-muted-foreground">Help us protect our coastal guardians by reporting threats or conservation opportunities.</p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex justify-between items-center mb-4">
                <CardTitle>Step {currentStep} of {totalSteps}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {currentStep === 1 && "Report Details"}
                  {currentStep === 2 && "Location & Evidence"}
                  {currentStep === 3 && "Review & Submit"}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>

            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Report Title</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the issue or observation"
                      value={formData.title}
                      onChange={(e) => updateFormData("title", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => updateFormData("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="threat">Environmental Threat</SelectItem>
                        <SelectItem value="conservation">Conservation Opportunity</SelectItem>
                        <SelectItem value="restoration">Restoration Project</SelectItem>
                        <SelectItem value="education">Community Education</SelectItem>
                        <SelectItem value="research">Research & Monitoring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={formData.urgency} onValueChange={(value) => updateFormData("urgency", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="How urgent is this issue?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - General observation</SelectItem>
                        <SelectItem value="medium">Medium - Needs attention</SelectItem>
                        <SelectItem value="high">High - Immediate action required</SelectItem>
                        <SelectItem value="critical">Critical - Emergency situation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Detailed Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed information about what you observed, including any relevant context or background information."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Enter the specific location or coordinates"
                        value={formData.location}
                        onChange={(e) => updateFormData("location", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Photo Upload</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-secondary/10 hover:bg-secondary/20 transition-colors">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">Drag and drop photos here, or click to browse</p>
                      <Button variant="mint" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">Maximum 5 files, 10MB each</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-secondary/20 rounded-lg p-6">
                    <h3 className="font-semibold text-primary mb-4 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Review Your Report
                    </h3>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Title:</span> {formData.title || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {formData.category || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium">Urgency:</span> {formData.urgency || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {formData.location || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium">Description:</span> 
                        <p className="mt-1 text-muted-foreground">{formData.description || "Not provided"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-ocean-light/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      By submitting this report, you confirm that the information provided is accurate to the best of your knowledge 
                      and agree to our community guidelines for environmental reporting.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                {currentStep > 1 && (
                  <Button variant="mint" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                )}
                <Button 
                  variant={currentStep === totalSteps ? "success" : "hero"} 
                  onClick={handleNext}
                  className="flex-1"
                >
                  {currentStep === totalSteps ? "Submit Report" : "Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Report;