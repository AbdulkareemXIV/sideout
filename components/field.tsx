type FieldErrorProps = {
  id: string;
  message: string | null;
};

/** Error text for one field, wired to it with aria-describedby. */
export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** A visible asterisk with a screen-reader label. */
export function RequiredMark({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}
