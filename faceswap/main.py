from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
import tempfile
import subprocess
import shutil
from typing import List

app = FastAPI(title="FaceFusion API")

@app.get("/")
async def root():
    return {"message": "FaceFusion API is running"}

@app.post("/swap")
async def swap_face(
    source: UploadFile = File(...),
    target: UploadFile = File(...)
):
    # Create a temporary directory for processing
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save uploaded files
        source_path = os.path.join(temp_dir, "source.png")
        target_path = os.path.join(temp_dir, "target.png")
        output_path = os.path.join(temp_dir, "output.png")
        
        # Save source and target images
        with open(source_path, "wb") as buffer:
            buffer.write(await source.read())
        
        with open(target_path, "wb") as buffer:
            buffer.write(await target.read())
        
        try:
            # Run FaceFusion CLI
            cmd = [
                "facefusion",
                "--source", source_path,
                "--target", target_path,
                "--output", output_path,
                "--headless"
            ]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"FaceFusion failed: {stderr}"
                )
            
            # Check if output file exists
            if not os.path.exists(output_path):
                raise HTTPException(
                    status_code=500,
                    detail="FaceFusion did not generate an output file"
                )
            
            # Create copy of output file in a new temp file that will persist after function ends
            temp_output = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            temp_output.close()
            shutil.copy2(output_path, temp_output.name)
            
            # Return the output file
            return FileResponse(
                temp_output.name,
                media_type="image/png",
                filename="swapped.png",
                background=shutil.rmtree,
                status_code=200
            )
        
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing request: {str(e)}"
            )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}