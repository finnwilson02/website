#\!/bin/bash

echo "# WEBSITE CODEBASE SUMMARY" > codebase_summary.txt
echo -e "\n## File Structure\n" >> codebase_summary.txt

# Add directory structure, excluding node_modules and img content
find . -type d | grep -v "^\./node_modules/\|^\./img/" | sort | while read dir; do
  if [ "$dir" == "./node_modules" ] || [ "$dir" == "./img" ]; then
    # Just show the directory name without contents
    depth=$(echo "$dir" | tr -cd "/" | wc -c)
    indent=$(printf "%*s" $((depth*2)) "")
    echo "$indent- ${dir##*/}/" >> codebase_summary.txt
  else
    # Show full path for other directories
    depth=$(echo "$dir" | tr -cd "/" | wc -c)
    indent=$(printf "%*s" $((depth*2)) "")
    echo "$indent- ${dir##*/}/" >> codebase_summary.txt
  fi
done

echo -e "\n## File Contents\n" >> codebase_summary.txt

# Add contents of each file
find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.py" \) -not -path "./node_modules/*" | sort | while read file; do
  echo -e "\n### $file\n" >> codebase_summary.txt
  echo "\`\`\`$(echo "${file##*.}")" >> codebase_summary.txt
  cat "$file" >> codebase_summary.txt
  echo -e "\n\`\`\`" >> codebase_summary.txt
done

