console.log('test_token:', process.env.test_token)
console.log('test_token_new:', process.env.test_token.slice(0, 8))
console.log(
  Object.entries(process.env).filter(([k]) => k.startsWith('TEST'))
)