
import { pipeline, env } from '@xenova/transformers';

// Fix for ERR_WORKER_PATH in some Node environments
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false; // Force download first time if not found

async function installModel() {
  console.log('🚀 Starting BGE-M3 Model Installation...');
  
  const modelName = 'Xenova/bge-m3';
  
  try {
    console.log(`\n⬇️ Downloading/Loading ${modelName}...`);
    console.log('   (This is a large model ~560MB, please wait...)');

    // Initialize pipeline to trigger download
    // Using default quantization (true) for BGE-M3 as unquantized is very large
    const extractor = await pipeline('feature-extraction', modelName);

    console.log('\n✅ Model installed and loaded successfully!');
    
    // Test run
    const testText = 'Hello world';
    const output = await extractor(testText, { pooling: 'mean', normalize: true });
    console.log('✅ Test embedding generated successfully.');
    console.log('Shape:', output.dims);

  } catch (error) {
    console.error('\n❌ Model installation failed:', error);
    process.exit(1);
  }
}

installModel();
