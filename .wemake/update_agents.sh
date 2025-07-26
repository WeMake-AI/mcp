#!/bin/zsh

# List of files to update
files=("Code_Review.md" "Deployment.md" "Development.md" "Documentation.md" "Feature_Requests.md" "Feedback.md" "Orchestration.md" "PRD_Building.md" "Prompt_Template.md" "Roadmap_Planning.md" "Testing.md" "Troubleshooting.md")

# Directory
 dir="/Users/admin/Repositories/WeMake/mcp/.wemake/agents/"

for file in "${files[@]}"; do
  fullpath="$dir$file"
  if [ -f "$fullpath" ]; then
    # Replace in header
    sed -i '' 's/Knowledge Graph Memory/Agent Collaboration/g' "$fullpath"
    
    # Find the line number of the section
    section_line=$(grep -n '^### Knowledge Graph Memory' "$fullpath" | cut -d: -f1)
    if [ ! -z "$section_line" ]; then
      # Replace section title
      sed -i '' "${section_line}s/### Knowledge Graph Memory/### Agent Collaboration/" "$fullpath"
      
      # Update description (assuming next lines are the description; adjust as needed)
      # For simplicity, replace the following lines with new content
      new_desc="For enhanced agent collaboration: Utilize the module at /Users/admin/Repositories/WeMake/mcp/src/agent-collaboration/ for persistence, resource sharing, communication, task delegation, enhanced querying, and integration as detailed in the architecture, management, API, and best practices documentation. Use for collaboration by querying shared graph across agents."
      # Assuming description is the next 1-2 lines; this is approximate
      sed -i '' "$(($section_line+1)),$(($section_line+3))d" "$fullpath"
      sed -i '' "${section_line}a\ $new_desc" "$fullpath"
    fi
    
    # Verify with diff
    git diff "$fullpath" || echo "No changes or git not setup"
  fi
done

echo "Updates complete."