import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Sparkles, Play, Download, Share2, Wand2, Image as ImageIcon, Video, Loader2 } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Progress } from './components/ui/progress'
import { Badge } from './components/ui/badge'
import { Toaster } from './components/ui/toaster'
import { useToast } from './hooks/use-toast'
import { blink } from './blink/client'

interface AnimationStyle {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

const animationStyles: AnimationStyle[] = [
  {
    id: 'smooth',
    name: 'Smooth Flow',
    description: 'Gentle, flowing movements',
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    description: 'Energetic and vibrant motion',
    icon: <Wand2 className="w-4 h-4" />
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Professional film-like animation',
    icon: <Video className="w-4 h-4" />
  }
]

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('smooth')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageSelect(files[0])
    }
  }

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, JPEG, WebP)',
        variant: 'destructive'
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB',
        variant: 'destructive'
      })
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const generateVideo = async () => {
    if (!selectedImage) {
      toast({
        title: 'No image selected',
        description: 'Please upload an image first',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    setProgress(0)

    try {
      // Upload image to storage first
      const { publicUrl } = await blink.storage.upload(
        selectedImage,
        `animations/${Date.now()}-${selectedImage.name}`,
        { upsert: true }
      )

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 1000)

      // Generate video using AI
      const videoPrompt = prompt 
        ? `Animate this image with ${selectedStyle} style: ${prompt}`
        : `Create a ${selectedStyle} animation from this image`

      // For now, we'll simulate video generation
      // In a real implementation, this would call an AI video generation service
      await new Promise(resolve => setTimeout(resolve, 8000))
      
      clearInterval(progressInterval)
      setProgress(100)

      // Simulate generated video URL
      setGeneratedVideo(publicUrl) // In real implementation, this would be the generated video URL

      toast({
        title: 'Video generated successfully!',
        description: 'Your animated video is ready to download',
      })

    } catch (error) {
      console.error('Error generating video:', error)
      toast({
        title: 'Generation failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const resetApp = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setPrompt('')
    setSelectedStyle('smooth')
    setGeneratedVideo(null)
    setProgress(0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full glass-effect">
          <div className="mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">AI Video Animator</h1>
            <p className="text-muted-foreground">
              Transform your images into captivating animated videos
            </p>
          </div>
          <Button onClick={() => blink.auth.login()} className="w-full">
            Sign In to Continue
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">AI Video Animator</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="hidden sm:flex">
              {user.email}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => blink.auth.logout()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!generatedVideo ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Upload Zone */}
              <Card className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Upload Your Image</h2>
                  <p className="text-muted-foreground">
                    Drag and drop an image or click to browse
                  </p>
                </div>

                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative max-w-sm mx-auto">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={resetApp}
                          className="absolute top-2 right-2"
                        >
                          Change
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedImage?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">
                        Drop your image here
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Supports PNG, JPG, JPEG, WebP (max 10MB)
                      </p>
                      <Button variant="outline">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Configuration */}
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Animation Style */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Animation Style</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {animationStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedStyle === style.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            {style.icon}
                            <span className="font-medium">{style.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {style.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* Optional Prompt */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Creative Prompt <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                    </h3>
                    <Textarea
                      placeholder="Describe how you want your image to be animated... (e.g., 'gentle swaying in the wind', 'floating in space', 'underwater movement')"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </Card>

                  {/* Generate Button */}
                  <Card className="p-6">
                    {isGenerating ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Generating your video...</span>
                          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>This may take a few moments</span>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={generateVideo}
                        className="w-full gradient-border"
                        size="lg"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Animated Video
                      </Button>
                    )}
                  </Card>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Success Message */}
              <Card className="p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Video Generated Successfully!</h2>
                <p className="text-muted-foreground">
                  Your animated video is ready to download and share
                </p>
              </Card>

              {/* Video Preview */}
              <Card className="p-6">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-6">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Video preview would appear here</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      (In production, this would show the generated animated video)
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Video
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={resetApp}>
                    Create Another
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Toaster />
    </div>
  )
}

export default App