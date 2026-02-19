import os
from pypdf import PdfReader

def extract_text(pdf_path, output_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Extracted {pdf_path} to {output_path}")
    except Exception as e:
        print(f"Failed to extract {pdf_path}: {e}")

pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]

for pdf_file in pdf_files:
    output_file = pdf_file.replace('.pdf', '.txt').replace('.PDF', '.txt')
    extract_text(pdf_file, output_file)
