'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function CreateServerWizard() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', dialect: 'postgresql', connectionString: '' })
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Redirect unauthenticated users to login
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
    })
  }, [])

  const handleNext = () => setStep((s) => s + 1)
  const handleBack = () => setStep((s) => s - 1)

  const handleConnect = async () => {
    setError(null)
    setIsExtracting(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenant/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          server_name: formData.name,
          connection_string: formData.connectionString
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to connect')
      
      router.push(`/dashboard/servers/${data.server_id}`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to extract schema from database connection string.')
      setIsExtracting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto mt-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Connect Database</h1>
        <p className="text-muted-foreground">Connect your database to automatically power your intelligent reasoning guardrails.</p>
        
        {/* Progress Bar */}
        <div className="mt-8 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-10" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
          
          {[1, 2, 3].map((num) => (
            <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= num ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-muted'}`}>
              {num}
            </div>
          ))}
        </div>
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardContent className="pt-6 min-h-[300px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <CardHeader className="px-0">
                  <CardTitle>Server Details</CardTitle>
                  <CardDescription>Give your reasoning server a recognizable name.</CardDescription>
                </CardHeader>
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name</Label>
                  <Input id="name" placeholder="e.g. Production Identity DB" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <CardHeader className="px-0">
                  <CardTitle>Engine Profile</CardTitle>
                  <CardDescription>Select your relational dialect.</CardDescription>
                </CardHeader>
                <div className="space-y-2">
                  <Label>SQL Dialect</Label>
                  <Select value={formData.dialect} onValueChange={(val) => setFormData({...formData, dialect: val})}>
                    <SelectTrigger><SelectValue placeholder="Select dialect" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="sqlserver">SQL Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <CardHeader className="px-0">
                  <CardTitle>Secure Connection</CardTitle>
                  <CardDescription>Provide a read-only connection string.</CardDescription>
                </CardHeader>
                <div className="space-y-2">
                  <Label htmlFor="conn">Connection URI</Label>
                  <Input id="conn" type="password" autoComplete="new-password" placeholder={`${formData.dialect}://user:pass@host:port/db`} value={formData.connectionString} onChange={(e) => setFormData({...formData, connectionString: e.target.value})} />
                </div>
                {isExtracting && (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-center animate-pulse mt-4">
                    <p className="text-primary font-bold">🔍 Analyzing Database Structure & Generating Policies...</p>
                  </div>
                )}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium mt-4">
                    ❌ {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={step === 1 || isExtracting}>Back</Button>
            {step < 3 ? (
              <Button onClick={handleNext} disabled={!formData.name}>Next Step</Button>
            ) : (
              <Button onClick={handleConnect} disabled={isExtracting || !formData.connectionString}>
                {isExtracting ? 'Connecting...' : 'Connect & Map'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
