
import React, { useRef, useEffect } from 'react';

interface AutoResizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AutoResizingTextarea: React.FC<AutoResizingTextareaProps> = ({ value, ...props }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            // Redefine temporariamente a altura para obter o novo scrollHeight
            textareaRef.current.style.height = 'auto';
            // Define a altura para o scrollHeight para ajustar ao conteúdo
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]); // Este efeito é executado sempre que o valor do texto muda

    return (
        <textarea
            ref={textareaRef}
            value={value}
            {...props}
        />
    );
};

export default AutoResizingTextarea;
