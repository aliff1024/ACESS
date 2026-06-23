import pypandoc
import re

# Paths
md_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\ACESS_References_Authoritative_Guide.md'
template_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\B032420037_FarizDanish_PSM.tex'
output_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\Combined_Template_Guide.tex'

# Convert Markdown to LaTeX fragment
print("Converting markdown to LaTeX...")
md_tex = pypandoc.convert_file(md_path, 'latex')

# Read the template
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
        
        # Also replace the title to match the ACESS system
        old_title_1 = "MACHINE LEARNING CLASSIFICATION OF TRANSPARENT CONDUCTIVE OXIDES USING \\\\\n\tX-RAY DIFFRACTION STRUCTURAL SIGNATURES"
        new_title_1 = "ADAPTIVE COGNITIVE \\& EDUCATIONAL SKILL SUPPORT (ACESS) \\\\\n\tAUTHORITATIVE REFERENCES \\& BEST-PRACTICE GUIDE"
        
        old_title_2 = "MACHINE LEARNING CLASSIFICATION OF TRANSPARENT CONDUCTIVE OXIDES USING \\\\\nX-RAY DIFFRACTION STRUCTURAL SIGNATURES"
        new_title_2 = "ADAPTIVE COGNITIVE \\& EDUCATIONAL SKILL SUPPORT (ACESS) \\\\\nAUTHORITATIVE REFERENCES \\& BEST-PRACTICE GUIDE"
        
        old_title_3 = "MACHINE LEARNING CLASSIFICATION OF TRANSPARENT CONDUCTIVE OXIDES USING X-RAY DIFFRACTION STRUCTURAL SIGNATURES"
        new_title_3 = "ADAPTIVE COGNITIVE \\& EDUCATIONAL SKILL SUPPORT (ACESS): AUTHORITATIVE REFERENCES \\& BEST-PRACTICE GUIDE"
        
        preamble_and_front = preamble_and_front.replace(old_title_1, new_title_1)
        preamble_and_front = preamble_and_front.replace(old_title_2, new_title_2)
        preamble_and_front = preamble_and_front.replace(old_title_3, new_title_3)
        
        # Also replace the Malay title in Borang Pengesahan
        preamble_and_front = preamble_and_front.replace("MACHINE LEARNING CLASSIFICATION OF TRANSPARENT CONDUCTIVE OXIDES", "ADAPTIVE COGNITIVE \\& EDUCATIONAL SKILL SUPPORT (ACESS)")
        preamble_and_front = preamble_and_front.replace("USING X-RAY DIFFRACTION STRUCTURAL SIGNATURES", "AUTHORITATIVE REFERENCES \\& BEST-PRACTICE GUIDE")
        
        # Combine
        combined = preamble_and_front + md_tex + postamble
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(combined)
        print('Successfully updated Combined_Template_Guide.tex with ACESS guide content.')
    else:
        print('Could not find start/end indices')
else:
    print('Could not find MAIN MATTER')
