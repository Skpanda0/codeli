"use client"
import LoginForm from '@/components/login-form'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import React from 'react'

const page = () => {
  const { data , isPending} = authClient.useSession()
    const router  = useRouter()
    if(data?.session && data?.user){
      router.push("/")
    }
    if (isPending){
      return(
        <div>
          <Spinner />
        </div>
      )
    }
  return (
    <>
        <LoginForm />
    </>
  )
}

export default page