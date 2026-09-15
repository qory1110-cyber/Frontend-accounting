import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod' 

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_APP_NAME: z.string().default ('Accounting'),
    VITE_API_URL: z.url().default('http://localhost:8014'),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})

export default env