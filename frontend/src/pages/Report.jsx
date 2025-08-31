import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../Components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/Card";
import { Input } from "../Components/Input";
import { Label } from "../Components/Label";
import { Textarea } from "../Components/Textarea";
import { Progress } from "../Components/Progress.jsx";
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
  X,
  Loader,
  Navigation,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import Navbar from "../Components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { isAuthenticated, getUser, getAuthToken } from "../utils/auth";

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

const Report = () => {
  const serverURL =
    import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api";

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    incidentType: "",
    severity: "medium",
    location: {
      coordinates: [null, null], // [longitude, latitude]
      address: "",
      landmark: "",
      accuracy: null,
    },
    isUrgent: false,
    tags: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    setIsLoading(false);
  }, [navigate]);

  // Get current location
  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY&limit=1`
          );
          const data = await response.json();

          let address = "Location retrieved";
          if (data.results && data.results.length > 0) {
            address = data.results[0].formatted || "Location retrieved";
          }

          setFormData((prev) => ({
            ...prev,
            location: {
              coordinates: [longitude, latitude],
              address: address,
              accuracy: Math.round(accuracy),
              landmark: "",
            },
          }));
        } catch (error) {
          console.error("Error getting address:", error);
          setFormData((prev) => ({
            ...prev,
            location: {
              coordinates: [longitude, latitude],
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              accuracy: Math.round(accuracy),
              landmark: "",
            },
          }));
        }

        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = "Unable to retrieve location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);

    if (uploadedFiles.length + files.length > 5) {
      alert("Maximum 5 files allowed");
      return;
    }

    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

      if (!allowedTypes.includes(file.type)) {
        alert(
          `Invalid file type: ${file.name}. Only JPEG, JPG, and PNG are allowed.`
        );
        return false;
      }

      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }

      return true;
    });

    const newFiles = validFiles.map((file) => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  // Remove uploaded file
  const removeFile = (fileId) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      // Clean up preview URL
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  // Take photo with camera
  const takePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  const submitReport = async () => {
    try {
      setIsSubmitting(true);

      // Validate coordinates before sending
      if (
        !formData.location.coordinates[0] ||
        !formData.location.coordinates[1]
      ) {
        throw new Error("Location coordinates are required");
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();

      // Add all form fields
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("incidentType", formData.incidentType);
      formDataToSend.append("severity", formData.severity);
      formDataToSend.append("isUrgent", formData.isUrgent);

      // Add location data in the format expected by backend validation
      formDataToSend.append(
        "location[longitude]",
        formData.location.coordinates[0]
      );
      formDataToSend.append(
        "location[latitude]",
        formData.location.coordinates[1]
      );
      if (formData.location.address) {
        formDataToSend.append("location[address]", formData.location.address);
      }
      if (formData.location.accuracy) {
        formDataToSend.append("location[accuracy]", formData.location.accuracy);
      }

      // Add tags if provided
      if (formData.tags) {
        formDataToSend.append("tags", formData.tags);
      }

      // Add image files
      uploadedFiles.forEach((fileObj) => {
        formDataToSend.append("images", fileObj.file);
      });

      // Get auth token
      const token = getAuthToken();

      const response = await fetch(`${serverURL}/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Report submitted successfully:", result);

        // Show success message
        alert(
          "Report submitted successfully! Thank you for helping protect our environment."
        );

        // Reset form and redirect
        setFormData({
          title: "",
          description: "",
          incidentType: "",
          severity: "medium",
          isUrgent: false,
          location: { address: "", coordinates: [null, null], accuracy: null },
          tags: "",
        });
        setUploadedFiles([]);
        setCurrentStep(1);

        // Optionally redirect to home or reports list
        // navigate('/');
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(`Error submitting report: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    // Step 1 validation
    if (currentStep === 1) {
      if (!formData.title || !formData.incidentType || !formData.description) {
        alert("Please fill all required fields before continuing.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (
        !formData.location.coordinates[0] ||
        !formData.location.coordinates[1]
      ) {
        alert("Please provide a location before continuing.");
        return;
      }
      if (uploadedFiles.length === 0) {
        alert("Please upload at least one photo before continuing.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      submitReport();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-blue-50 relative">
        <Navbar />
        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
            <Card className="shadow-xl border-0 backdrop-blur-xl bg-white/90">
              <CardContent className="text-center py-12">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-green-800 mb-4">
                  Report Submitted Successfully!
                </h2>
                <p className="text-gray-600 mb-6 text-lg">
                  Thank you for helping protect our mangroves. Your report has
                  been submitted and will be reviewed by our AI system and
                  expert team.
                </p>
                <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
                  <p className="text-sm text-green-700">
                    Report ID:{" "}
                    <span className="font-mono font-bold">
                      #{Math.floor(Math.random() * 100000)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="default"
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Another Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                  >
                    Go to Dashboard
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
    <div className="min-h-screen relative bg-gradient-to-b from-green-50 via-emerald-50 to-blue-50">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 text-green-200">
          <Camera className="w-20 h-20" />
        </div>
        <div className="absolute bottom-10 right-10 text-green-200">
          <MapPin className="w-24 h-24" />
        </div>
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                Report a Mangrove Issue
              </h1>
              <p className="text-gray-600 text-lg">
                Help us protect our coastal guardians by reporting threats or
                conservation opportunities
              </p>
            </div>

            <Card className="shadow-2xl backdrop-blur-sm bg-white/90 rounded-2xl border-0">
              <CardHeader>
                <div className="flex justify-between items-center mb-4">
                  <CardTitle className="text-xl font-bold text-green-800">
                    Step {currentStep} of {totalSteps}
                  </CardTitle>
                  <span className="text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full">
                    {currentStep === 1 && "Report Details"}
                    {currentStep === 2 && "Location & Evidence"}
                    {currentStep === 3 && "Review & Submit"}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className="h-3 rounded-full bg-green-100"
                />
              </CardHeader>
              <CardContent className="space-y-6">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                      <p className="text-red-700">{submitError}</p>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <Label
                          htmlFor="title"
                          className="text-sm font-medium text-gray-700"
                        >
                          Report Title *
                        </Label>
                        <Input
                          id="title"
                          placeholder="Brief description of the issue"
                          value={formData.title}
                          onChange={(e) =>
                            updateFormData("title", e.target.value)
                          }
                          required
                          className="transition focus:ring-2 focus:ring-green-400 border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="incidentType"
                          className="text-sm font-medium text-gray-700"
                        >
                          Incident Type *
                        </Label>
                        <Select
                          value={formData.incidentType}
                          onValueChange={(value) =>
                            updateFormData("incidentType", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300">
                            <SelectValue placeholder="Select incident type" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-white shadow-xl rounded-lg border border-gray-200">
                            <SelectItem
                              value="cutting"
                              className="hover:bg-green-50"
                            >
                              🪓 Mangrove Cutting
                            </SelectItem>
                            <SelectItem
                              value="dumping"
                              className="hover:bg-green-50"
                            >
                              🗑️ Waste Dumping
                            </SelectItem>
                            <SelectItem
                              value="pollution"
                              className="hover:bg-green-50"
                            >
                              ☢️ Water Pollution
                            </SelectItem>
                            <SelectItem
                              value="encroachment"
                              className="hover:bg-green-50"
                            >
                              �️ Land Encroachment
                            </SelectItem>
                            <SelectItem
                              value="fire"
                              className="hover:bg-green-50"
                            >
                              � Fire Damage
                            </SelectItem>
                            <SelectItem
                              value="other"
                              className="hover:bg-green-50"
                            >
                              ❓ Other Issue
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="severity"
                          className="text-sm font-medium text-gray-700"
                        >
                          Severity Level
                        </Label>
                        <Select
                          value={formData.severity}
                          onValueChange={(value) =>
                            updateFormData("severity", value)
                          }
                        >
                          <SelectTrigger className="border-gray-300">
                            <SelectValue placeholder="Select severity level" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-white shadow-xl rounded-lg border border-gray-200">
                            <SelectItem
                              value="low"
                              className="hover:bg-green-50"
                            >
                              🟢 Low - Minor issue
                            </SelectItem>
                            <SelectItem
                              value="medium"
                              className="hover:bg-green-50"
                            >
                              🟡 Medium - Moderate concern
                            </SelectItem>
                            <SelectItem
                              value="high"
                              className="hover:bg-green-50"
                            >
                              🟠 High - Serious threat
                            </SelectItem>
                            <SelectItem
                              value="critical"
                              className="hover:bg-green-50"
                            >
                              🔴 Critical - Immediate action needed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="description"
                          className="text-sm font-medium text-gray-700"
                        >
                          Detailed Description *
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Provide detailed information about what you observed..."
                          rows={4}
                          value={formData.description}
                          onChange={(e) =>
                            updateFormData("description", e.target.value)
                          }
                          required
                          className="transition focus:ring-2 focus:ring-green-400 border-gray-300"
                        />
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <input
                          type="checkbox"
                          id="isUrgent"
                          checked={formData.isUrgent}
                          onChange={(e) =>
                            updateFormData("isUrgent", e.target.checked)
                          }
                          className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                        />
                        <Label
                          htmlFor="isUrgent"
                          className="text-sm font-medium text-orange-800"
                        >
                          🚨 Mark as urgent (requires immediate attention)
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="tags"
                          className="text-sm font-medium text-gray-700"
                        >
                          Tags (optional)
                        </Label>
                        <Input
                          id="tags"
                          placeholder="Add tags separated by commas (e.g., illegal-cutting, plastic-waste)"
                          value={formData.tags}
                          onChange={(e) =>
                            updateFormData("tags", e.target.value)
                          }
                          className="transition focus:ring-2 focus:ring-green-400 border-gray-300"
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
                      {/* Location Section */}
                      <div className="space-y-4">
                        <Label className="text-lg font-semibold text-gray-800 flex items-center">
                          <MapPin className="w-5 h-5 mr-2" />
                          Location Information
                        </Label>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-blue-800">
                              📍 Get precise location for better verification
                            </p>
                            <Button
                              type="button"
                              onClick={getCurrentLocation}
                              disabled={locationLoading}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {locationLoading ? (
                                <Loader className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Navigation className="w-4 h-4 mr-2" />
                              )}
                              {locationLoading
                                ? "Getting Location..."
                                : "Use Current Location"}
                            </Button>
                          </div>

                          {locationError && (
                            <div className="text-red-600 text-sm mt-2">
                              {locationError}
                            </div>
                          )}

                          {formData.location.coordinates[0] && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-sm text-gray-600">
                                <strong>Coordinates:</strong>{" "}
                                {formData.location.coordinates[1]?.toFixed(6)},{" "}
                                {formData.location.coordinates[0]?.toFixed(6)}
                              </p>
                              {formData.location.accuracy && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Accuracy: ±{formData.location.accuracy}m
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Address/Description</Label>
                          <Input
                            id="address"
                            placeholder="Enter specific location details or address"
                            value={formData.location.address}
                            onChange={(e) =>
                              updateFormData("location.address", e.target.value)
                            }
                            className="transition focus:ring-2 focus:ring-green-400 border-gray-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="landmark">
                            Nearby Landmark (optional)
                          </Label>
                          <Input
                            id="landmark"
                            placeholder="e.g., Near fishing village, Behind mangrove resort"
                            value={formData.location.landmark}
                            onChange={(e) =>
                              updateFormData(
                                "location.landmark",
                                e.target.value
                              )
                            }
                            className="transition focus:ring-2 focus:ring-green-400 border-gray-300"
                          />
                        </div>
                      </div>

                      {/* Photo Upload Section */}
                      <div className="space-y-4">
                        <Label className="text-lg font-semibold text-gray-800 flex items-center">
                          <Camera className="w-5 h-5 mr-2" />
                          Evidence Photos
                        </Label>

                        <div className="grid grid-cols-2 gap-4">
                          <div
                            onClick={takePhoto}
                            className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center bg-green-50 hover:bg-green-100 transition-colors cursor-pointer flex flex-col items-center"
                          >
                            <Camera className="h-12 w-12 text-green-500 mb-3" />
                            <p className="text-sm text-green-700 font-medium">
                              Take Photo
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Use camera
                            </p>
                          </div>

                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="h-12 w-12 text-blue-500 mb-3" />
                            <p className="text-sm text-blue-700 font-medium">
                              Upload Files
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Choose from device
                            </p>
                          </div>
                        </div>

                        {/* Hidden file inputs */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileUpload}
                        />

                        <p className="text-xs text-gray-500 text-center">
                          📸 Max 5 photos, 10MB each • JPEG, PNG supported
                        </p>

                        {/* Display uploaded files */}
                        {uploadedFiles.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700">
                              Uploaded Photos ({uploadedFiles.length}/5)
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                              {uploadedFiles.map((fileObj) => (
                                <div
                                  key={fileObj.id}
                                  className="relative group"
                                >
                                  <img
                                    src={fileObj.preview}
                                    alt={fileObj.name}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeFile(fileObj.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                                    {fileObj.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Show selected files with remove option */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-gray-700">
                            Uploaded Photos ({uploadedFiles.length}/5)
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            {uploadedFiles.map((fileObj) => (
                              <div key={fileObj.id} className="relative group">
                                <img
                                  src={fileObj.preview}
                                  alt={fileObj.name}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFile(fileObj.id)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                                  {fileObj.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 className="font-bold text-green-800 text-lg mb-4 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Review Your Report
                        </h3>

                        <div className="space-y-4 text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <span className="font-semibold text-gray-700">
                                  Title:
                                </span>
                                <p className="text-gray-900">
                                  {formData.title || "Not specified"}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">
                                  Incident Type:
                                </span>
                                <p className="text-gray-900">
                                  {formData.incidentType || "Not specified"}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">
                                  Severity:
                                </span>
                                <p className="text-gray-900 capitalize">
                                  {formData.severity}
                                </p>
                              </div>
                              {formData.isUrgent && (
                                <div className="text-orange-600 font-medium">
                                  🚨 Marked as Urgent
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <span className="font-semibold text-gray-700">
                                  Location:
                                </span>
                                <p className="text-gray-900">
                                  {formData.location.address || "Not specified"}
                                </p>
                                {formData.location.coordinates[0] && (
                                  <p className="text-xs text-gray-500">
                                    {formData.location.coordinates[1]?.toFixed(
                                      6
                                    )}
                                    ,{" "}
                                    {formData.location.coordinates[0]?.toFixed(
                                      6
                                    )}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">
                                  Photos:
                                </span>
                                <p className="text-gray-900">
                                  {uploadedFiles.length} file(s) attached
                                </p>
                              </div>
                              {formData.tags && (
                                <div>
                                  <span className="font-semibold text-gray-700">
                                    Tags:
                                  </span>
                                  <p className="text-gray-900">
                                    {formData.tags}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-green-200">
                            <span className="font-semibold text-gray-700">
                              Description:
                            </span>
                            <p className="mt-2 text-gray-900 bg-white p-3 rounded border leading-relaxed">
                              {formData.description ||
                                "No description provided"}
                            </p>
                          </div>

                          {uploadedFiles.length > 0 && (
                            <div className="pt-4 border-t border-green-200">
                              <span className="font-semibold text-gray-700 block mb-3">
                                Attached Photos:
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {uploadedFiles.map((fileObj) => (
                                  <img
                                    key={fileObj.id}
                                    src={fileObj.preview}
                                    alt={fileObj.name}
                                    className="w-full h-16 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">
                              Before submitting:
                            </p>
                            <ul className="space-y-1 text-xs">
                              <li>
                                ✓ Ensure all information is accurate and
                                complete
                              </li>
                              <li>✓ Photos clearly show the reported issue</li>
                              <li>✓ Location information is precise</li>
                              <li>✓ You agree to our community guidelines</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex space-x-3 pt-6 border-t border-gray-200">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1 border-gray-300 hover:bg-gray-50"
                      disabled={isSubmitting}
                    >
                      ← Back
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className={`flex-1 ${
                      currentStep === totalSteps
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : currentStep === totalSteps ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Report
                      </>
                    ) : (
                      "Continue →"
                    )}
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
