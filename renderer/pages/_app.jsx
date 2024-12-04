import React from 'react'
import '../styles/globals.css'
import { FormProvider } from '../context/FormContext'; // Adjust the path as needed
import Layout from './layout'
function MyApp({ Component, pageProps }) {

  return (
    <FormProvider>
  <Layout>
  <Component {...pageProps} />
  </Layout>
  </FormProvider>
  )
}

export default MyApp
