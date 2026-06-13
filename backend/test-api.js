const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI('AIzaSyAtMfDD8A_jZRTbXkGLaB2i2o3GrjQ-xO0');
  
  try {
    // List models
    // wait, @google/generative-ai SDK doesn't expose listModels directly easily, wait it's not well documented.
    // Instead I'll use fetch directly.
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAtMfDD8A_jZRTbXkGLaB2i2o3GrjQ-xO0');
    const data = await res.json();
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name));
  } catch (err) {
    console.error(err);
  }
}
test();
