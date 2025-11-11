import { FC } from 'react';

interface IconFilterProps {
    className?: string;
}

const IconFilter: FC<IconFilterProps> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
        </svg>
    );
};

export default IconFilter;
