import pypandoc
import re
import os

# Convert Guide to LaTeX fragment
guide_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\3-FYP-Writing-Guide-2025_v1.docx'
guide_tex_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\Guide_Content.tex'

print("Converting guide to LaTeX...")
pypandoc.convert_file(guide_path, 'latex', outputfile=guide_tex_path)

# Read the template
template_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\B032420037_FarizDanish_PSM.tex'
print("Reading template...")
with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

main_matter_start = template.find('%%% MAIN MATTER %%%')
if main_matter_start != -1:
    # Find the start of CHAPTER 1
    start_idx = template.find('%==========================================================%', main_matter_start)
    end_idx = template.rfind('\\end{document}')
    
    if start_idx != -1 and end_idx != -1:
        preamble_and_front = template[:start_idx] + '\n'
        postamble = '\n\n' + template[end_idx:]
        
        with open(guide_tex_path, 'r', encoding='utf-8') as f:
            guide_content = f.read()
            
        combined = preamble_and_front + guide_content + postamble
        
        output_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\Combined_Template_Guide.tex'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(combined)
        print('Successfully created Combined_Template_Guide.tex')
    else:
        print('Could not find start/end indices')
else:
    print('Could not find MAIN MATTER')
