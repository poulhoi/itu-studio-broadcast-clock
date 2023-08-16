vim.api.nvim_create_autocmd("BufWritePost", {
    callback = function()
        local tmux_cmd = "tmux send-keys -t 1.2 -- C-c Space flask Space --app Space clock Space run Enter"
        vim.fn.systemlist(tmux_cmd)
    end
})
