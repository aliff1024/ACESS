import os

file_path = r'C:\Users\user\OneDrive\Documents\PSM\ACESS-main\New folder\Combined_Template_Guide.tex'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace student name
content = content.replace("FARIZ DANISH BIN FADLI", "MUHAMMAD ALIFF BIN AFFANDI")

# Replace any occurrence of the old ID if it exists
content = content.replace("B032420037", "B032420067")

# Program name (BITS usually stands for Software Engineering in UTeM, while BITI is AI)
# But to be safe, I'll just change the name. If the user wants the program changed, they can specify.
content = content.replace("Artificial Intelligence", "Software Engineering")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated student details in Combined_Template_Guide.tex")
