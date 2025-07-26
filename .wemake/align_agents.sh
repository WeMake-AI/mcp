#!/bin/zsh

# List of files
files=("Code_Review.md" "Deployment.md" "Development.md" "Documentation.md" "Feature_Requests.md" "Feedback.md" "Orchestration.md" "PRD_Building.md" "Prompt_Template.md" "Roadmap_Planning.md" "Testing.md" "Troubleshooting.md")

dir="/Users/admin/Repositories/WeMake/mcp/.wemake/agents/"

# Multi-line content
cat << EOF > /tmp/align_content.txt
- Use delegate_task for task assignment: run_mcp {server_name: "mcp.config.usrlocalmcp.AgentCollaboration", tool_name: "delegate_task", args: {taskId, title, description, assignedAgent, priority, metadata}}.
- Share resources via share_resource: args {resourceId, resourceType, sharedWithId, permissions, metadata}.
- Communicate with send_agent_message: args {toAgentId, content, priority}.
- Maintain shared knowledge graphs using create_entity for agent states, add_relation for dependencies, query_graph for retrieval.
- For events, publish_event/subscribe_event to set up communication channels.
Note: Ensure AgentCollaboration server is registered for full functionality.
EOF

for file in "${files[@]}"; do
  fullpath="$dir$file"
  if [ -f "$fullpath" ]; then
    # Find line of '## Collaboration Mechanisms'
    section_line=$(grep -n '^## Collaboration Mechanisms' "$fullpath" | cut -d: -f1)
    if [ ! -z "$section_line" ]; then
      # Insert after the last item, assuming list items start with '- '
      last_item_line=$(awk "/^## Collaboration Mechanisms/{f=1} f && !/^-/ {exit} f" "$fullpath" | wc -l | xargs)
      insert_line=$(($section_line + $last_item_line))
      sed -i '' "${insert_line}r /tmp/align_content.txt" "$fullpath"
    fi
    # Verify
    git diff "$fullpath" || echo "No changes in $file"
  fi
done

rm /tmp/align_content.txt
echo "Alignments updated in mechanisms."