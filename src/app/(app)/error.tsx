'use client' // Error components must be Client Components
 
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
 
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App-specific error:", error)
  }, [error])
 
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">An error occurred in this section.</h2>
      <p className="text-muted-foreground mb-6">
        We're sorry, something went wrong while loading this part of the application.
      </p>
      <Button
        onClick={() => reset()}
        variant="outline"
      >
        Reload Section
      </Button>
    </div>
  )
}
